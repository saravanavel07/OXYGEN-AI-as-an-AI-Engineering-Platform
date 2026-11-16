/// <reference types="google.maps" />
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  ColorScheme,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
  useApiIsLoaded,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Star,
  X,
} from 'lucide-react';

interface PlaceSummary {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  rating?: number | null;
  userRatingCount?: number | null;
  primaryType?: string | null;
  websiteURI?: string | null;
  googleMapsURI?: string | null;
  isOpenNow?: boolean | null;
}

interface RouteSummary {
  distanceText: string;
  durationText: string;
  travelMode: string;
  originLabel: string;
  destinationLabel: string;
}

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 37.7749, lng: -122.4194 };

const PRESET_QUERIES = [
  'AI Research Laboratories',
  'University Engineering Libraries',
  'Tech Coworking Spaces',
  'EV Fast Charging Stations',
];

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const upper = msg.toUpperCase();
  return (
    upper.includes('OVER_QUERY_LIMIT') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('QUOTA') ||
    upper.includes('429')
  );
}

function formatDurationMillis(ms?: number | null): string {
  if (!ms || !Number.isFinite(ms)) return '—';
  const totalMins = Math.round(ms / 60_000);
  if (totalMins < 60) return `${totalMins} min`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs} hr ${mins} min`;
}

function formatDistanceMeters(meters?: number): string {
  if (!meters || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const PlaceMarker: React.FC<{
  place: PlaceSummary;
  selected: boolean;
  onSelect: (place: PlaceSummary) => void;
  onCloseInfo: () => void;
  onSetOrigin: (place: PlaceSummary) => void;
  onComputeRouteTo: (place: PlaceSummary) => void;
}> = ({ place, selected, onSelect, onCloseInfo, onSetOrigin, onComputeRouteTo }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.displayName}
        onClick={() => onSelect(place)}
      >
        <Pin
          background={selected ? '#F5F5F5' : '#E32636'}
          borderColor={selected ? '#E32636' : '#8F101D'}
          glyphColor={selected ? '#E32636' : '#F5F5F5'}
          scale={selected ? 1.25 : 1.0}
        />
      </AdvancedMarker>

      {selected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={280}>
          <div className="p-1 text-neutral-900 space-y-1.5">
            <div className="font-semibold text-sm leading-snug">{place.displayName}</div>
            {place.primaryType && (
              <div className="text-[11px] font-medium text-neutral-600">{place.primaryType}</div>
            )}
            <div className="text-xs text-neutral-700 leading-snug">{place.formattedAddress}</div>
            {place.rating != null && (
              <div className="text-xs font-medium text-neutral-800">
                Rating: {place.rating.toFixed(1)} ({place.userRatingCount ?? 0} reviews)
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onSetOrigin(place)}
                className="rounded bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-700"
              >
                Set Origin
              </button>
              <button
                type="button"
                onClick={() => onComputeRouteTo(place)}
                className="rounded bg-[#E32636] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#8F101D]"
              >
                Route Here
              </button>
              {place.googleMapsURI && (
                <a
                  href={place.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  <span>Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const GeospatialWorkbenchInner: React.FC = () => {
  const map = useMap();
  const isLoaded = useApiIsLoaded();
  const loadingStatus = useApiLoadingStatus();
  const coreLib = useMapsLibrary('core');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [textQuery, setTextQuery] = useState('');
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);

  // Origin / Destination & Routing
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [originPlace, setOriginPlace] = useState<PlaceSummary | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'TRANSIT' | 'BICYCLING'>('DRIVING');
  const [computingRoute, setComputingRoute] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const activePolylinesRef = useRef<google.maps.Polyline[]>([]);

  const clearPolylines = useCallback(() => {
    for (const pl of activePolylinesRef.current) {
      pl.setMap(null);
    }
    activePolylinesRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearPolylines();
    };
  }, [clearPolylines]);

  // Modern AutocompleteSuggestion hook behavior with AutocompleteSessionToken
  useEffect(() => {
    if (!placesLib || !autocompleteInput.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: autocompleteInput.trim(),
          sessionToken: sessionTokenRef.current,
          language: 'en',
          region: 'US',
        });
        if (!cancelled) {
          setSuggestions(res?.suggestions ?? []);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, autocompleteInput]);

  const toPlaceSummary = (p: google.maps.places.Place): PlaceSummary | null => {
    if (!p.location) return null;
    return {
      id: p.id || `place-${Math.random().toString(36).slice(2, 9)}`,
      displayName: p.displayName || 'Unnamed Location',
      formattedAddress: p.formattedAddress || 'Address unavailable',
      location: { lat: p.location.lat(), lng: p.location.lng() },
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      primaryType: p.primaryTypeDisplayName,
      websiteURI: p.websiteURI,
      googleMapsURI: p.googleMapsURI,
    };
  };

  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setStatusMessage(null);
    try {
      const placeObj = suggestion.placePrediction.toPlace();
      await placeObj.fetchFields({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'viewport',
          'rating',
          'userRatingCount',
          'primaryTypeDisplayName',
          'websiteURI',
          'googleMapsURI',
        ],
      });

      sessionTokenRef.current = null;
      setSuggestions([]);
      setAutocompleteInput('');

      const summary = toPlaceSummary(placeObj);
      if (summary) {
        setPlaces((prev) => {
          const withoutDup = prev.filter((item) => item.id !== summary.id);
          return [summary, ...withoutDup];
        });
        setSelectedPlace(summary);
        if (map) {
          if (placeObj.viewport) {
            map.fitBounds(placeObj.viewport);
          } else {
            map.panTo(summary.location);
            map.setZoom(14);
          }
        }
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setStatusMessage(err instanceof Error ? err.message : 'Unable to fetch place details.');
    }
  };

  const runPlaceTextSearch = async (queryText: string) => {
    if (!placesLib || !queryText.trim()) return;
    setSearchingPlaces(true);
    setStatusMessage(null);
    try {
      const center = map?.getCenter()?.toJSON() ?? DEFAULT_CENTER;
      const response = await placesLib.Place.searchByText({
        textQuery: queryText.trim(),
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'userRatingCount',
          'primaryTypeDisplayName',
          'websiteURI',
          'googleMapsURI',
        ],
        locationBias: { center, radius: 25000 },
        maxResultCount: 10,
        language: 'en',
        region: 'US',
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });

      const found = (response?.places ?? [])
        .map(toPlaceSummary)
        .filter((x): x is PlaceSummary => x !== null);

      setPlaces(found);
      if (found.length === 0) {
        setStatusMessage(`No matching places returned for "${queryText.trim()}". Try panning or broadening your search.`);
        setSelectedPlace(null);
        return;
      }

      setSelectedPlace(found[0]);
      if (map && coreLib) {
        const bounds = new coreLib.LatLngBounds();
        for (const item of found) {
          bounds.extend(item.location);
        }
        map.fitBounds(bounds);
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setStatusMessage(err instanceof Error ? err.message : 'Place search request failed.');
    } finally {
      setSearchingPlaces(false);
    }
  };

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Browser Geolocation API is unavailable in this environment.');
      return;
    }
    setStatusMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setOriginPlace(null);
        if (map) {
          map.panTo(coords);
          map.setZoom(12);
        }
      },
      (err) => {
        setStatusMessage(`Geolocation declined or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const handleComputeRoute = async (destination: PlaceSummary) => {
    if (!routesLib || !map) {
      setStatusMessage('Routes library is still initializing.');
      return;
    }

    const activeOriginCoords = originPlace?.location ?? userLocation;
    const activeOriginLabel = originPlace?.displayName ?? (userLocation ? 'Current Location' : '');

    if (!activeOriginCoords) {
      setStatusMessage('Select an Origin place ("Set Origin") or enable "Use My Location" first.');
      return;
    }
    if (originPlace && originPlace.id === destination.id) {
      setStatusMessage('Origin and Destination must be different locations.');
      return;
    }

    setComputingRoute(true);
    setStatusMessage(null);
    clearPolylines();
    setRouteSummary(null);

    try {
      const result = await routesLib.Route.computeRoutes({
        origin: activeOriginCoords,
        destination: destination.location,
        travelMode,
        fields: ['durationMillis', 'distanceMeters', 'path', 'viewport', 'localizedValues'],
        language: 'en',
        region: 'US',
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });

      const primaryRoute = result?.routes?.[0];
      if (!primaryRoute) {
        setStatusMessage('No drivable/transit route found between these coordinates.');
        return;
      }

      const polylines = primaryRoute.createPolylines({
        polylineOptions: {
          strokeColor: '#E32636',
          strokeOpacity: 0.95,
          strokeWeight: 5,
        },
      });
      for (const pl of polylines) {
        pl.setMap(map);
      }
      activePolylinesRef.current = polylines;

      if (primaryRoute.viewport) {
        map.fitBounds(primaryRoute.viewport);
      }

      setRouteSummary({
        distanceText:
          primaryRoute.localizedValues?.distance || formatDistanceMeters(primaryRoute.distanceMeters),
        durationText:
          primaryRoute.localizedValues?.duration || formatDurationMillis(primaryRoute.durationMillis),
        travelMode,
        originLabel: activeOriginLabel,
        destinationLabel: destination.displayName,
      });
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setStatusMessage(err instanceof Error ? err.message : 'Unable to compute route.');
    } finally {
      setComputingRoute(false);
    }
  };

  if (loadingStatus === APILoadingStatus.FAILED || loadingStatus === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="rounded-xl border border-[#E32636]/40 bg-[#E32636]/10 p-6 text-xs text-[#F5F5F5]">
        Unable to initialize the Google Maps JavaScript SDK. Verify network connectivity or check account quota status.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Autocomplete Jump + Places Text Search + Geolocation Consent */}
      <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Place Autocomplete (AutocompleteSuggestion + SessionToken) */}
          <div className="lg:col-span-5 relative">
            <label className="block text-[11px] font-medium text-[#969696] mb-1">
              Jump to City, Address, or Campus (Places Autocomplete)
            </label>
            <div className="relative">
              <Compass className="h-3.5 w-3.5 text-[#969696] absolute left-3 top-2.5" />
              <input
                type="text"
                value={autocompleteInput}
                onChange={(e) => setAutocompleteInput(e.target.value)}
                placeholder="Type an address, campus, or tech hub..."
                className="w-full rounded-lg border border-white/15 bg-[#080808] pl-8 pr-3 py-2 text-xs text-[#F5F5F5] placeholder-[#737373] focus:border-[#E32636] focus:outline-none"
              />
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute z-30 mt-1 w-full rounded-lg border border-white/15 bg-[#101010] shadow-xl max-h-56 overflow-y-auto divide-y divide-white/10">
                {suggestions.map((s, idx) => (
                  <li key={s.placePrediction?.placeId || idx}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-xs text-[#E5E5E5] hover:bg-[#E32636]/15 transition-colors"
                    >
                      {s.placePrediction?.text.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Places Text Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runPlaceTextSearch(textQuery);
            }}
            className="lg:col-span-7"
          >
            <label className="block text-[11px] font-medium text-[#969696] mb-1">
              Search Places in Viewport (Places API New · Text Search)
            </label>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 text-[#969696] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  placeholder="e.g., AI research centers, university libraries, coworking..."
                  className="w-full rounded-lg border border-white/15 bg-[#080808] pl-8 pr-3 py-2 text-xs text-[#F5F5F5] placeholder-[#737373] focus:border-[#E32636] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searchingPlaces || !isLoaded || !textQuery.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E32636] px-4 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{searchingPlaces ? 'Searching...' : 'Search Places'}</span>
              </button>
              {!userLocation ? (
                <button
                  type="button"
                  onClick={handleRequestGeolocation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#101010] px-3 py-2 text-xs text-[#B8B8B8] hover:text-[#F5F5F5] hover:border-[#E32636]/60 whitespace-nowrap shrink-0"
                >
                  <LocateFixed className="h-3.5 w-3.5 text-[#E32636]" />
                  <span>Use My Location</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setUserLocation(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E32636]/40 bg-[#E32636]/10 px-3 py-2 text-xs text-[#F5F5F5] whitespace-nowrap shrink-0"
                >
                  <X className="h-3.5 w-3.5 text-[#E32636]" />
                  <span>Clear Location</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Preset Discovery Triggers & Route Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[#969696] mr-1">Quick Search:</span>
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={searchingPlaces || !isLoaded}
                onClick={() => {
                  setTextQuery(preset);
                  runPlaceTextSearch(preset);
                }}
                className="rounded-lg border border-white/10 bg-[#101010] px-2.5 py-1 text-[11px] text-[#B8B8B8] hover:text-[#F5F5F5] hover:border-[#E32636]/60 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#969696]">Travel Mode:</span>
            <select
              value={travelMode}
              onChange={(e) =>
                setTravelMode(e.target.value as 'DRIVING' | 'WALKING' | 'TRANSIT' | 'BICYCLING')
              }
              className="rounded-lg border border-white/15 bg-[#080808] px-2.5 py-1 text-xs text-[#F5F5F5]"
            >
              <option value="DRIVING">Driving</option>
              <option value="WALKING">Walking</option>
              <option value="TRANSIT">Transit</option>
              <option value="BICYCLING">Bicycling</option>
            </select>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-white/15 bg-[#101010] px-4 py-2.5 text-xs text-[#D4D4D4]">
          {statusMessage}
        </div>
      )}

      {/* Route Telemetry Strip */}
      {routeSummary && (
        <div className="rounded-xl border border-[#E32636]/40 bg-[#171717]/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Navigation className="h-4 w-4 text-[#E32636]" />
            <span>
              <strong className="text-[#F5F5F5]">{routeSummary.originLabel}</strong>
              <span className="text-[#969696] mx-1.5">to</span>
              <strong className="text-[#F5F5F5]">{routeSummary.destinationLabel}</strong>
              <span className="text-[#969696] ml-2 font-mono">({routeSummary.travelMode})</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[#F5F5F5] tabular-nums">
              {routeSummary.distanceText} · {routeSummary.durationText}
            </span>
            <button
              type="button"
              onClick={() => {
                clearPolylines();
                setRouteSummary(null);
              }}
              className="text-[#969696] hover:text-[#F5F5F5]"
            >
              Clear Route
            </button>
          </div>
        </div>
      )}

      {/* Split Map + Discovered Places Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Map Canvas with explicit height (CF2) + mapId (CF9) + Mandatory Attribution */}
        <div className="lg:col-span-8 relative h-[540px] w-full rounded-xl overflow-hidden border border-white/10 bg-[#080808]">
          {!isLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080808]/90 text-xs text-[#969696]">
              Loading Google Maps JavaScript SDK...
            </div>
          )}
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={12}
            gestureHandling="greedy"
            colorScheme={ColorScheme.DARK}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {userLocation && (
              <AdvancedMarker position={userLocation} title="Your Current Location">
                <Pin background="#38BDF8" borderColor="#0284C7" glyphColor="#080808" scale={0.95} />
              </AdvancedMarker>
            )}

            {places.map((p) => (
              <PlaceMarker
                key={p.id}
                place={p}
                selected={selectedPlace?.id === p.id}
                onSelect={(pl) => setSelectedPlace(pl)}
                onCloseInfo={() => setSelectedPlace(null)}
                onSetOrigin={(pl) => {
                  setOriginPlace(pl);
                  setStatusMessage(`Origin set to ${pl.displayName}. Choose any destination and click "Route Here".`);
                }}
                onComputeRouteTo={handleComputeRoute}
              />
            ))}
          </Map>
        </div>

        {/* Discovered Places Panel */}
        <aside className="lg:col-span-4 rounded-xl border border-white/10 bg-[#171717]/90 p-4 flex flex-col h-[540px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <div>
              <div className="text-sm font-semibold text-[#F5F5F5]">Discovered Places</div>
              <div className="text-[11px] text-[#969696]">
                {originPlace
                  ? `Origin: ${originPlace.displayName}`
                  : userLocation
                    ? 'Origin: Current Browser Location'
                    : 'Set an origin to compute routes'}
              </div>
            </div>
            <span className="font-mono text-xs text-[#B8B8B8] tabular-nums">{places.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {places.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <MapPin className="h-6 w-6 text-[#969696]" />
                <div className="text-xs font-medium text-[#F5F5F5]">Search Real-World Locations</div>
                <p className="text-[11px] text-[#969696] leading-relaxed">
                  Use Autocomplete or Search Places above to explore engineering hubs, campuses, or facilities via live Google Maps Platform APIs.
                </p>
              </div>
            ) : (
              places.map((pl) => {
                const isSelected = selectedPlace?.id === pl.id;
                const isOrigin = originPlace?.id === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`rounded-lg border p-3 text-xs space-y-2 transition-colors ${
                      isSelected
                        ? 'border-[#E32636] bg-[#E32636]/10'
                        : 'border-white/10 bg-[#101010] hover:border-white/25'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlace(pl);
                        if (map) {
                          map.panTo(pl.location);
                        }
                      }}
                      className="w-full text-left space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#F5F5F5] leading-snug">
                          {pl.displayName}
                        </span>
                        {pl.rating != null && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#B8B8B8] shrink-0 tabular-nums">
                            <Star className="h-3 w-3 text-[#E32636]" />
                            {pl.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {pl.primaryType && (
                        <div className="text-[11px] text-[#969696]">{pl.primaryType}</div>
                      )}
                      <div className="text-[11px] text-[#B8B8B8] leading-snug">
                        {pl.formattedAddress}
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOriginPlace(pl);
                          setStatusMessage(`Origin set to ${pl.displayName}. Select any destination and click "Route Here".`);
                        }}
                        className={`rounded px-2 py-1 text-[11px] border transition-colors ${
                          isOrigin
                            ? 'border-[#E32636] bg-[#E32636] text-[#F5F5F5]'
                            : 'border-white/15 bg-[#171717] text-[#B8B8B8] hover:text-[#F5F5F5]'
                        }`}
                      >
                        {isOrigin ? 'Active Origin' : 'Set Origin'}
                      </button>
                      <button
                        type="button"
                        disabled={computingRoute}
                        onClick={() => handleComputeRoute(pl)}
                        className="rounded px-2 py-1 text-[11px] bg-[#171717] border border-white/15 text-[#F5F5F5] hover:border-[#E32636] disabled:opacity-40"
                      >
                        {computingRoute ? 'Routing...' : 'Route Here'}
                      </button>
                      {pl.googleMapsURI && (
                        <a
                          href={pl.googleMapsURI}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#969696] hover:text-[#F5F5F5]"
                        >
                          <span>Google Maps</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export const GeospatialView: React.FC = () => {
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
  const [mapsApiKey, setMapsApiKey] = useState<string>(envKey);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(!envKey);

  useEffect(() => {
    if (envKey) {
      setMapsApiKey(envKey);
      setLoadingConfig(false);
      return;
    }
    fetch('/api/maps/config')
      .then((r) => r.json())
      .then((data: { configured?: boolean; apiKey?: string }) => {
        if (data.configured && data.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Ignore network errors on initial config check
      })
      .finally(() => {
        setLoadingConfig(false);
      });
  }, [envKey]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">
            Geospatial & Places Explorer
          </h1>
          <p className="text-xs text-[#969696] mt-1">
            Interactive Google Maps Platform workbench powered by Maps JavaScript API, Places API (New), Advanced Markers, and Routes API.
          </p>
        </div>
        <a
          href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-[#969696] hover:text-[#F5F5F5]"
        >
          <span>Google Maps End User Terms</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {loadingConfig ? (
        <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-10 text-center text-xs text-[#969696]">
          Loading Google Maps Platform configuration...
        </div>
      ) : !mapsApiKey ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#171717]/80 p-10 text-center space-y-2">
          <MapPin className="h-6 w-6 text-[#E32636] mx-auto" />
          <div className="text-sm font-semibold text-[#F5F5F5]">
            Google Maps API Key Not Detected Yet
          </div>
          <p className="text-xs text-[#969696] max-w-md mx-auto">
            Ensure your Google Maps Platform key is configured in Secrets (`VITE_GOOGLE_MAPS_API_KEY` or `GOOGLE_MAPS_API_KEY`) and restart the server if newly provisioned.
          </p>
        </div>
      ) : (
        <APIProvider
          apiKey={mapsApiKey}
          libraries={['places', 'marker', 'routes']}
          language="en"
          region="US"
        >
          <GeospatialWorkbenchInner />
        </APIProvider>
      )}
    </div>
  );
};
