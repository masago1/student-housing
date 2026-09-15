"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AccountButton() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <a
      href={user ? "/dashboard" : "/login"}
      style={{
        color: "#111827",
        textDecoration: "none",
        padding: "11px 16px",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        visibility: loading ? "hidden" : "visible",
      }}
    >
      {user ? "Contul meu" : "Intră în cont"}
    </a>
  );
}
