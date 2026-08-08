import { useEffect, useRef, useState } from "react";
import {
  fetchRegions,
  fetchProvinces,
  fetchCitiesMunicipalities,
  fetchCitiesByRegion,
  fetchCityZip,
  fetchBarangays,
} from "../../utils/psgc";
import SearchableSelect from "./SearchableSelect";

// Shape of the address slice this component owns. Spread this into a form's
// initial state and pass the matching slice back out via onChange.
export const emptyAddressValue = {
  region: "",
  regionCode: "",
  province: "",
  provinceCode: "",
  city: "",
  cityCode: "",
  barangay: "",
  zipCode: "",
};

// Drop-in replacement for a manually-typed Region/Province/City/Barangay
// block. Cascades through the live PSGC API (regions -> provinces -> cities
// & municipalities -> barangays) and auto-fills Zip Code once a city or
// municipality is picked, since PHLPost zip codes are assigned at that
// level. Covers every region in the Philippines, including NCR (whose 4
// districts come back from the API as regular "provinces").
//
// `Field` and `inputClass` are passed in so this matches whichever form
// it's dropped into (CreatePatientModal vs. the full EMR form use slightly
// different styling).
export default function AddressFields({ value, onChange, Field, inputClass, required = true }) {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState({ regions: false, provinces: false, cities: false, barangays: false });
  const [errors, setErrors] = useState({ regions: "", provinces: "", cities: "", barangays: "" });
  const [regionsReloadKey, setRegionsReloadKey] = useState(0);
  const [noProvinces, setNoProvinces] = useState(false);
  const latestCityRequest = useRef(null);

  // Regions — load once.
  useEffect(() => {
    let alive = true;
    setLoading((l) => ({ ...l, regions: true }));
    setErrors((e) => ({ ...e, regions: "" }));
    fetchRegions()
      .then((data) => alive && setRegions(data))
      .catch(() => alive && setErrors((e) => ({ ...e, regions: "Couldn't load regions." })))
      .finally(() => alive && setLoading((l) => ({ ...l, regions: false })));
    return () => {
      alive = false;
    };
  }, [regionsReloadKey]);

  // Provinces — reload whenever the selected region changes.
  useEffect(() => {
    if (!value.regionCode) {
      setProvinces([]);
      setNoProvinces(false);
      return;
    }
    let alive = true;
    setLoading((l) => ({ ...l, provinces: true }));
    setErrors((e) => ({ ...e, provinces: "" }));
    fetchProvinces(value.regionCode)
      .then((data) => {
        if (!alive) return;
        setProvinces(data);
        // Some regions (NCR being the main one) have no provinces at all —
        // cities sit directly under the region instead. Without this, a
        // region like that would leave City stuck disabled forever, since
        // it was waiting on a Province that can never be selected.
        setNoProvinces(data.length === 0);
      })
      .catch(() => alive && setErrors((e) => ({ ...e, provinces: "Couldn't load provinces." })))
      .finally(() => alive && setLoading((l) => ({ ...l, provinces: false })));
    return () => {
      alive = false;
    };
  }, [value.regionCode]);

  // Cities/Municipalities — reload whenever the selected province changes,
  // or (for provinceless regions like NCR) whenever the region changes.
  useEffect(() => {
    if (noProvinces) {
      if (!value.regionCode) {
        setCities([]);
        return;
      }
      let alive = true;
      setLoading((l) => ({ ...l, cities: true }));
      setErrors((e) => ({ ...e, cities: "" }));
      fetchCitiesByRegion(value.regionCode)
        .then((data) => alive && setCities(data))
        .catch(() => alive && setErrors((e) => ({ ...e, cities: "Couldn't load cities/municipalities." })))
        .finally(() => alive && setLoading((l) => ({ ...l, cities: false })));
      return () => {
        alive = false;
      };
    }

    if (!value.provinceCode) {
      setCities([]);
      return;
    }
    let alive = true;
    setLoading((l) => ({ ...l, cities: true }));
    setErrors((e) => ({ ...e, cities: "" }));
    fetchCitiesMunicipalities(value.provinceCode)
      .then((data) => alive && setCities(data))
      .catch(() => alive && setErrors((e) => ({ ...e, cities: "Couldn't load cities/municipalities." })))
      .finally(() => alive && setLoading((l) => ({ ...l, cities: false })));
    return () => {
      alive = false;
    };
  }, [value.provinceCode, value.regionCode, noProvinces]);

  // Barangays — reload whenever the selected city/municipality changes.
  useEffect(() => {
    if (!value.cityCode) {
      setBarangays([]);
      return;
    }
    let alive = true;
    setLoading((l) => ({ ...l, barangays: true }));
    setErrors((e) => ({ ...e, barangays: "" }));
    fetchBarangays(value.cityCode)
      .then((data) => alive && setBarangays(data))
      .catch(() => alive && setErrors((e) => ({ ...e, barangays: "Couldn't load barangays." })))
      .finally(() => alive && setLoading((l) => ({ ...l, barangays: false })));
    return () => {
      alive = false;
    };
  }, [value.cityCode]);

  function handleRegionChange(code) {
    const region = regions.find((r) => r.code === code);
    onChange({
      region: region?.name || "",
      regionCode: code,
      province: "",
      provinceCode: "",
      city: "",
      cityCode: "",
      barangay: "",
      zipCode: "",
    });
  }

  function handleProvinceChange(code) {
    const province = provinces.find((p) => p.code === code);
    onChange({
      province: province?.name || "",
      provinceCode: code,
      city: "",
      cityCode: "",
      barangay: "",
      zipCode: "",
    });
  }

  function handleCityChange(code) {
    const city = cities.find((c) => c.code === code);
    onChange({
      city: city?.name || "",
      cityCode: code,
      barangay: "",
      zipCode: "",
    });
    latestCityRequest.current = code;
    if (city?.name) {
      // Zip codes are assigned per city/municipality by PHLPost, and only
      // v1 of the API exposes them — fetched separately so the city change
      // itself doesn't have to wait on it. Guarded so a slow response for a
      // city the user has since changed away from can't overwrite the zip
      // for whatever they picked next.
      fetchCityZip(city.name).then((zip) => {
        if (zip && latestCityRequest.current === code) {
          onChange({ zipCode: zip });
        }
      });
    }
  }

  function handleBarangayChange(name) {
    onChange({ barangay: name });
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Region" required={required}>
          <SearchableSelect
            value={value.regionCode}
            onChange={handleRegionChange}
            options={regions}
            loading={loading.regions}
            loadingLabel="Loading regions…"
            placeholder="Select region"
            required={required}
            inputClass={inputClass}
          />
          {errors.regions && (
            <p className="text-xs text-red-600 mt-1">
              {errors.regions}{" "}
              <button
                type="button"
                onClick={() => setRegionsReloadKey((k) => k + 1)}
                className="underline"
              >
                Retry
              </button>
            </p>
          )}
        </Field>

        <Field label="Province" required={required && !noProvinces}>
          <SearchableSelect
            value={value.provinceCode}
            onChange={handleProvinceChange}
            options={provinces}
            disabled={!value.regionCode || noProvinces}
            loading={loading.provinces}
            loadingLabel="Loading provinces…"
            placeholder={
              !value.regionCode
                ? "Select region first"
                : noProvinces
                ? "Not applicable for this region"
                : "Select province"
            }
            required={required && !noProvinces}
            inputClass={inputClass}
          />
          {errors.provinces && <p className="text-xs text-red-600 mt-1">{errors.provinces}</p>}
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="City / Municipality" required={required}>
          <SearchableSelect
            value={value.cityCode}
            onChange={handleCityChange}
            options={cities}
            disabled={noProvinces ? !value.regionCode : !value.provinceCode}
            loading={loading.cities}
            loadingLabel="Loading cities…"
            placeholder={
              (noProvinces ? !value.regionCode : !value.provinceCode)
                ? noProvinces
                  ? "Select region first"
                  : "Select province first"
                : "Select city / municipality"
            }
            required={required}
            inputClass={inputClass}
          />
          {errors.cities && <p className="text-xs text-red-600 mt-1">{errors.cities}</p>}
        </Field>

        <Field label="Barangay" required={required}>
          <SearchableSelect
            value={value.barangay}
            onChange={handleBarangayChange}
            options={barangays}
            getValue={(b) => b.name}
            disabled={!value.cityCode}
            loading={loading.barangays}
            loadingLabel="Loading barangays…"
            placeholder={!value.cityCode ? "Select city first" : "Select barangay"}
            required={required}
            inputClass={inputClass}
          />
          {errors.barangays && <p className="text-xs text-red-600 mt-1">{errors.barangays}</p>}
        </Field>
      </div>

      <Field label="Zip Code">
        <input
          value={value.zipCode}
          readOnly
          placeholder="Auto-filled from City / Municipality"
          className={`${inputClass} bg-slate-50 text-slate-500`}
        />
      </Field>
    </>
  );
}