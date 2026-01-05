/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { generateWatercolourPainting } from './geminiService';
import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = "AIzaSyDzmSHds_56_oeLYEbXpfgGSzkX_502axI";

const loader = new Loader({
    apiKey: GOOGLE_MAPS_API_KEY,
    version: "beta",
    libraries: ["places", "marker", "geocoding"],
});

const placeholders = [
    "Eiffel Tower, Av. Gustave Eiffel, 75007 Paris, France",
    "Where you grew up",
    "Buckingham Palace, London SW1A 1AA, UK",
    "Where you first met each other",
    "Statue of Liberty, New York, NY 10004, USA"
];

const App: React.FC = () => {
    const [address, setAddress] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [mapInitialized, setMapInitialized] = useState<boolean>(false);
    const [isGeneratingPainting, setIsGeneratingPainting] = useState<boolean>(false);
    const [watercolourPainting, setWatercolourPainting] = useState<string>('');
    const [capturedMapImage, setCapturedMapImage] = useState<string>('');
    const [placeholder, setPlaceholder] = useState<string>(placeholders[0]);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerInstanceRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const autocompleteRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setPlaceholder(currentPlaceholder => {
                const currentIndex = placeholders.indexOf(currentPlaceholder);
                const nextIndex = (currentIndex + 1) % placeholders.length;
                return placeholders[nextIndex];
            });
        }, 3000); // Change placeholder every 3 seconds

        return () => clearInterval(intervalId);
    }, []);

    const initMap = useCallback(async (location: google.maps.LatLngLiteral, formattedAddr: string) => {
        if (!mapRef.current) return;

        const { Map } = await loader.importLibrary('maps');
        const { AdvancedMarkerElement } = await loader.importLibrary('marker');

        const mapOptions: google.maps.MapOptions = {
            center: location,
            zoom: 20,
            mapId: 'DEMO_MAP_ID',
            mapTypeId: 'satellite',
            tilt: 67.5,
            heading: 0,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
        };

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new Map(mapRef.current, mapOptions);
        } else {
            mapInstanceRef.current.setOptions(mapOptions);
        }

        if (!markerInstanceRef.current) {
            const markerElement = document.createElement('div');
            markerElement.innerHTML = ``;
            
            markerInstanceRef.current = new AdvancedMarkerElement({
                position: location,
                map: null,
                title: formattedAddr,
                content: markerElement,
            });
        } else {
            markerInstanceRef.current.position = location;
            markerInstanceRef.current.title = formattedAddr;
            markerInstanceRef.current.map = mapInstanceRef.current;
        }



        setMapInitialized(true);
        setWatercolourPainting('');
        setCapturedMapImage('');
    }, []);

    useEffect(() => {
        let autocomplete: google.maps.places.Autocomplete;
        let listener: google.maps.MapsEventListener;

        loader.load().then(() => {
            if (autocompleteRef.current) {
                autocomplete = new google.maps.places.Autocomplete(autocompleteRef.current, {
                    types: ['address'],
                });

                listener = autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry?.location && place.formatted_address) {
                        setAddress(place.formatted_address);
                        initMap(place.geometry.location.toJSON(), place.formatted_address);
                    }
                });
            }
        });

        return () => {
            if (listener) {
                listener.remove();
            }
        };
    }, [initMap]);



    const captureMapView = useCallback(async (): Promise<string> => {
        if (!mapInstanceRef.current) {
            throw new Error("Map is not initialized.");
        }
        const map = mapInstanceRef.current;
        
        // Capture satellite view using html2canvas
        const mapDiv = map.getDiv();
        const canvas = await html2canvas(mapDiv, { useCORS: true, allowTaint: true });
        return canvas.toDataURL('image/png');
    }, []);

    const handleShow3DView = async () => {
        setError(null);
        if (!address.trim()) {
            setError("Please enter an address.");
            return;
        }

        setIsLoading(true);
        try {
            const { Geocoder } = await loader.importLibrary('geocoding');
            const geocoder = new Geocoder();
            const { results } = await geocoder.geocode({ address });

            if (results && results[0]) {
                const location = results[0].geometry.location;
                const formattedAddr = results[0].formatted_address;
                setAddress(formattedAddr); // Update the address state with the formatted one
                initMap(location.toJSON(), formattedAddr);
            } else {
                // Set a more user-friendly error
                setError(`Could not find a location for "${address}". Please try a more specific address or select one from the list.`);
            }
        } catch (err) {
            if (err instanceof Error && err.message.includes('ZERO_RESULTS')) {
                setError(`Could not find a location for "${address}". Please check the address and try again.`);
            } else {
                setError(err instanceof Error ? err.message : "An unknown error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateWatercolour = async () => {
        const isRerunning = !!watercolourPainting;
    
        setIsGeneratingPainting(true);
        setError(null);
    
        try {
            let imageToProcess: string;
    
            if (isRerunning && capturedMapImage) {
                // Re-running with the cached image
                imageToProcess = capturedMapImage;
            } else {
                // First run, or run from map view: capture a new image
                const newImageDataUrl = await captureMapView();
                setCapturedMapImage(newImageDataUrl); // Cache the image
                imageToProcess = newImageDataUrl;
            }
    
            const paintingDataUrl = await generateWatercolourPainting(imageToProcess);
            setWatercolourPainting(paintingDataUrl); // This overwrites the old one if it exists
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate watercolor painting.");
            // On error, clear everything to go back to the map state.
            setWatercolourPainting('');
            setCapturedMapImage('');
        } finally {
            setIsGeneratingPainting(false);
        }
    };
    
    const handleBackToMap = () => {
        setWatercolourPainting('');
        setCapturedMapImage('');
    };

    const handleDownloadPainting = () => {
        if (!watercolourPainting) return;
        const link = document.createElement('a');
        link.href = watercolourPainting;
        const safeAddress = address.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `watercolour_${safeAddress || 'painting'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            <style>{`.pac-container { z-index: 1050 !important; }`}</style>
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <header>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Paint A Place</h1>
                    <p className="text-gray-600 mb-6">Enter the address to your favorite spot, then turn the satellite image into watercolor paintings.</p>
                </header>

                <div className="mb-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                    <div className="relative">
                        <input
                            ref={autocompleteRef}
                            type="text"
                            id="address"
                            onChange={(e) => setAddress(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleShow3DView();
                                }
                            }}
                            disabled={isLoading}
                            className="w-full pl-4 pr-12 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                            placeholder={placeholder}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleShow3DView}
                                    disabled={isLoading}
                                    className="p-1 text-gray-500 rounded-full hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    aria-label="Search"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                    {mapInitialized && (
                        <button
                            onClick={handleGenerateWatercolour}
                            disabled={isGeneratingPainting}
                            className="flex-grow bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105 shadow-md disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center h-12 whitespace-nowrap"
                        >
                            {isGeneratingPainting ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                watercolourPainting ? '🎨 Re-create Watercolor' : '🎨 Create Watercolor'
                            )}
                        </button>
                    )}
                     {watercolourPainting && !isGeneratingPainting && (
                        <button
                            onClick={handleBackToMap}
                            className="flex-grow bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-transform transform hover:scale-105 shadow-md flex items-center justify-center h-12 whitespace-nowrap"
                        >
                            🗺️ Back to Map
                        </button>
                    )}
                </div>

                {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center" role="alert">{error}</div>}
                
                <div className="bg-gray-50 rounded-2xl h-[70vh] shadow-inner overflow-hidden relative">
                    <div ref={mapRef} className={`w-full h-full rounded-2xl transition-opacity duration-300 ${mapInitialized && !watercolourPainting && !isGeneratingPainting ? 'opacity-100' : 'opacity-0'}`} />

                    {!mapInitialized && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-200 rounded-2xl">
                            <p className="text-gray-500 text-center px-4">Map will be displayed here after submitting an address.</p>
                        </div>
                    )}
                    
                    {isGeneratingPainting && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-75 rounded-2xl z-10 transition-opacity duration-300">
                            <div className="text-center text-white p-4">
                                <svg className="animate-spin h-10 w-10 text-white mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <h3 className="text-xl font-semibold">Creating your masterpiece...</h3>
                                <p className="mt-2 text-gray-300">The AI is warming up its brushes. This may take a moment.</p>
                            </div>
                        </div>
                    )}

                    {watercolourPainting && !isGeneratingPainting && (
                        <div className="absolute inset-0 w-full h-full flex flex-col bg-white rounded-2xl z-10 transition-opacity duration-300">
                            <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Generated Watercolour Painting</h3>
                                    <p className="text-sm text-gray-600">AI-generated from your 3D satellite view</p>
                                </div>
                                <button
                                    onClick={handleDownloadPainting}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md"
                                    aria-label="Download painting"
                                    title="Download painting"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download
                                </button>
                            </div>
                            <div className="flex flex-col flex-row text-center items-center justify-center p-4 bg-gray-50 min-h-0">
                                <img 
                                    src={watercolourPainting} 
                                    alt="Watercolor painting of the building"
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-gray-500 mt-4 text-center">
                    Zoom and tilt as much as you can! Poor data gives poor paintings 🥹
                </p>
                <p className="text-gray-500 text-center">
                    Paintings are an interpretation of the building, and may not be perfectly accurate.
                </p>
                <p className="text-gray-500 text-center">
                    But they sure are pretty!
                </p>
                
            </div>
            <footer className="text-gray-500 mt-6 text-center text-sm">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-neutral-500">
                    <p className="whitespace-nowrap">Powered by Gemini 2.5 Flash Image Preview</p>
                    <span className="hidden md:inline text-neutral-700" aria-hidden="true">|</span>
                    <p>
                        Created by{' '}
                        <a
                            href="https://x.com/leslienooteboom"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-yellow-400 transition-colors duration-200"
                        >
                            @leslienooteboom
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default App;
