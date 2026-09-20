"use client";

import { useEffect, useState } from "react";
import MobileHomeClient from "./MobileHomeClient";

export default function HomeDeviceRouter({
  desktop,
  universities = [],
  cities = [],
}) {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(max-width: 768px)"
    );

    const update = () => {
      setIsMobile(mediaQuery.matches);
    };

    update();

    mediaQuery.addEventListener(
      "change",
      update
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        update
      );
    };
  }, []);

  if (isMobile === null) {
    return null;
  }

  if (isMobile) {
    return (
      <MobileHomeClient
        universities={universities}
        cities={cities}
      />
    );
  }

  return desktop;
}
