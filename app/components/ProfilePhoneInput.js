"use client";

import { getCountries, getCountryCallingCode } from "libphonenumber-js/max";
import { profilePhoneDisplay } from "../lib/phone";

const names = new Intl.DisplayNames(["ro"], { type: "region" });
const countries = getCountries().sort((a, b) => names.of(a).localeCompare(names.of(b), "ro"));
const flag = country => String.fromCodePoint(...[...country].map(letter => 127397 + letter.charCodeAt(0)));

export default function ProfilePhoneInput({ value, country, onChange, readOnly, disabled, required, error }) {
  const style = {
    height: "44px", boxSizing: "border-box",
    border: required ? "1px solid #60A5FA" : "1px solid #CBD5E1",
    borderRadius: "9px", padding: "0 12px", color: "#172554",
    fontFamily: "inherit", fontSize: "13px", outline: "none",
    boxShadow: required ? "0 0 0 3px rgba(59, 130, 246, 0.08)" : "none",
    background: readOnly ? "#F8FAFC" : "#FFFFFF",
  };
  const format = input => {
    const display = profilePhoneDisplay(input, country);
    onChange(display.national, display.country);
  };
  return (
    <>
      <div style={{ display: "flex", gap: "8px", minWidth: 0 }}>
        <select aria-label="Țara și prefixul telefonic" value={country}
          disabled={disabled || readOnly}
          onChange={event => onChange(value, event.target.value)}
          style={{ ...style, width: "112px", flexShrink: 0, padding: "0 6px" }}>
          {countries.map(code => (
            <option key={code} value={code} label={code === country ? `${flag(code)} +${getCountryCallingCode(code)}` : undefined}>
              {flag(code)} +{getCountryCallingCode(code)} {names.of(code)}
            </option>
          ))}
        </select>
        <input type="tel" inputMode="tel" autoComplete="tel-national"
          aria-label="Număr de telefon" aria-invalid={Boolean(error)}
          aria-describedby={error ? "profile-phone-error" : !readOnly ? "profile-phone-notice" : undefined}
          value={value} readOnly={readOnly} disabled={disabled}
          onChange={event => {
            const input = event.target.value;
            if (/^(\+|00)/.test(input.trim())) format(input);
            else onChange(input, country);
          }}
          onBlur={() => { if (!readOnly) format(value); }}
          placeholder={country === "RO" ? "7XX XXX XXX" : "Număr de telefon"}
          maxLength={40} style={{ ...style, width: "100%", minWidth: 0 }} />
      </div>
      {!readOnly && <div id="profile-phone-notice" style={{ marginTop: "7px", color: "#64748B", fontSize: "11px", lineHeight: "1.5" }}>
        Numărul de telefon poate fi setat o singură dată pentru acest cont. Verifică-l cu atenție înainte de salvare.
      </div>}
    </>
  );
}
