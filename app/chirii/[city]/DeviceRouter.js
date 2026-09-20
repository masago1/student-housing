"use client";

import { useEffect, useState } from "react";
import CityListingsClient from "./CityListingsClient";
import MobileCityListingsClient from "./MobileCityListingsClient";

export default function DeviceRouter() {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(max-width: 768px)"
    );

    const updateDevice = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateDevice();

    mediaQuery.addEventListener(
      "change",
      updateDevice
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateDevice
      );
    };
  }, []);

  if (isMobile === null) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#F8FAFC",
        }}
      />
    );
  }

  if (isMobile) {
    return <MobileCityListingsClient />;
  }

  return <CityListingsClient />;
}
