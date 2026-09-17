"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function createCircle(center, radiusInMeters = 500, points = 64) {
    const [longitude, latitude] = center;

    const coordinates = [];
    const earthRadius = 6371000;
    const latitudeRadians = (latitude * Math.PI) / 180;

    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;

        const dx = Math.cos(angle) * radiusInMeters;
        const dy = Math.sin(angle) * radiusInMeters;

        const deltaLatitude =
            (dy / earthRadius) * (180 / Math.PI);

        const deltaLongitude =
            (dx /
                (earthRadius * Math.cos(latitudeRadians))) *
            (180 / Math.PI);

        coordinates.push([
            longitude + deltaLongitude,
            latitude + deltaLatitude,
        ]);
    }

    return {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [coordinates],
        },
    };
}

export default function ApproximateLocationMap({
    latitude,
    longitude,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            !MAPBOX_TOKEN ||
            !containerRef.current ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [lng, lat],
            zoom: 14.2,
            attributionControl: true,
        });

        mapRef.current = map;

        map.addControl(
            new mapboxgl.NavigationControl({
                showCompass: false,
            }),
            "top-right"
        );

        map.on("load", () => {
            if (!map.getSource("approximate-location")) {
                map.addSource("approximate-location", {
                    type: "geojson",
                    data: createCircle([lng, lat], 500),
                });
            }

            if (!map.getLayer("approximate-location-fill")) {
                map.addLayer({
                    id: "approximate-location-fill",
                    type: "fill",
                    source: "approximate-location",
                    paint: {
                        "fill-color": "#2563eb",
                        "fill-opacity": 0.18,
                    },
                });
            }

            if (!map.getLayer("approximate-location-outline")) {
                map.addLayer({
                    id: "approximate-location-outline",
                    type: "line",
                    source: "approximate-location",
                    paint: {
                        "line-color": "#2563eb",
                        "line-width": 2,
                        "line-opacity": 0.75,
                    },
                });
            }
        });

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [latitude, longitude]);

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        !MAPBOX_TOKEN ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        return null;
    }

    return (
        <div style={{ width: "100%" }}>
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "360px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                }}
            />

            <div
                style={{
                    marginTop: "11px",
                    color: "#6b7280",
                    fontSize: "13px",
                    lineHeight: "1.5",
                }}
            >
                Locația afișată pe hartă este aproximativă.
            </div>
        </div>
    );
}
