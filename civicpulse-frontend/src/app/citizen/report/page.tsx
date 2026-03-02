"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Info, Upload } from 'lucide-react';

const CATEGORIES = ['GARBAGE', 'WATER', 'ROADS', 'LIGHTING', 'INFRASTRUCTURE', 'OTHER'];

// Default to Ahmedabad, India
const DEFAULT_LAT = 23.0225;
const DEFAULT_LNG = 72.5714;

export default function ReportIssuePage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [marker, setMarker] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [wards, setWards] = useState<{ id: string, name: string }[]>([]);
    const [selectedWard, setSelectedWard] = useState<string>('');

    React.useEffect(() => {
        api.get('/admin/wards').then(res => {
            setWards(res.data);
            if (res.data.length > 0) setSelectedWard(res.data[0].id);
        }).catch(err => console.error("Failed to load wards", err));
    }, []);

    const onMapClick = useCallback((e: any) => {
        setMarker({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await api.post('/issues', {
                title,
                description,
                category,
                latitude: marker.lat,
                longitude: marker.lng,
                wardId: selectedWard || undefined,
                isAnonymous,
                imageUrls
            });

            router.push('/citizen');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit issue');
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        // Simulate upload delay for realism in mockup
        setTimeout(() => {
            const newUrls = Array.from(files).map(f => URL.createObjectURL(f));
            setImageUrls(prev => [...prev, ...newUrls].slice(0, 3)); // Max 3 images
            setIsUploading(false);
        }, 800);
    };

    const removeImage = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight">Report New Issue</h1>
                <p className="text-neutral-400 mt-1">Select the location on the map and provide details about the problem.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Map Column */}
                <div className="space-y-4">
                    <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700">
                        <h3 className="text-white font-medium mb-2 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-emerald-500" />
                            Pinpoint Location
                        </h3>
                        <p className="text-sm text-neutral-400 mb-4">Click anywhere on the map to set the exact location of the issue.</p>

                        <div className="h-[400px] rounded-lg overflow-hidden border border-neutral-600 relative">
                            <Map
                                initialViewState={{
                                    longitude: DEFAULT_LNG,
                                    latitude: DEFAULT_LAT,
                                    zoom: 12
                                }}
                                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                                onClick={onMapClick}
                                cursor="crosshair"
                            >
                                <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
                                    <MapPin className="w-8 h-8 text-red-500 drop-shadow-lg" />
                                </Marker>
                            </Map>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs text-neutral-500 font-mono">
                            <div>Lat: {marker.lat.toFixed(6)}</div>
                            <div>Lng: {marker.lng.toFixed(6)}</div>
                        </div>
                    </div>
                </div>

                {/* Form Column */}
                <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 h-fit">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Issue Title</label>
                            <input
                                type="text"
                                required
                                maxLength={100}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Large pothole on main street"
                                className="block w-full px-3 py-2 border border-neutral-600 rounded-lg bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="block w-full px-3 py-2 border border-neutral-600 rounded-lg bg-neutral-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Ward</label>
                            <select
                                value={selectedWard}
                                onChange={(e) => setSelectedWard(e.target.value)}
                                className="block w-full px-3 py-2 border border-neutral-600 rounded-lg bg-neutral-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            >
                                <option value="">Select a Ward (Optional)</option>
                                {wards.map(ward => (
                                    <option key={ward.id} value={ward.id}>{ward.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
                            <textarea
                                required
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Provide detailed information. This will be automatically summarized by our AI for city officials."
                                className="block w-full px-3 py-2 border border-neutral-600 rounded-lg bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
                            />
                            <p className="text-xs text-neutral-500 mt-2">
                                Note: AI will process this text to generate a standardized actionable summary.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1">
                                Photo Evidence (Max 3)
                            </label>

                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-600 border-dashed rounded-lg bg-neutral-900/30 hover:bg-neutral-900/50 transition-colors">
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-10 w-10 text-neutral-500" />
                                    <div className="flex text-sm text-neutral-400 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-emerald-500 hover:text-emerald-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleImageUpload} disabled={isUploading || imageUrls.length >= 3} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-neutral-500">
                                        PNG, JPG, GIF up to 10MB
                                    </p>
                                </div>
                            </div>

                            {isUploading && (
                                <div className="mt-3 flex items-center justify-center text-sm text-emerald-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-2"></div>
                                    Uploading...
                                </div>
                            )}

                            {imageUrls.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    {imageUrls.map((url, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-neutral-600 aspect-video bg-neutral-900">
                                            <img src={url} alt={`Upload ${idx}`} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center">
                            <input
                                id="anonymous"
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-neutral-600 rounded bg-neutral-900/50"
                            />
                            <label htmlFor="anonymous" className="ml-2 block text-sm text-neutral-300">
                                Submit anonymously (your name will be hidden from officers and public)
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {isSubmitting ? 'Processing & Submitting...' : 'Submit Issue Report'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
