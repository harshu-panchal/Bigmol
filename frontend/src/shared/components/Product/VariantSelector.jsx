import { useState, useEffect, useMemo } from "react";
import { FiCheck } from "react-icons/fi";
import { formatPrice } from "../../utils/helpers";
import { getVariantSignature } from "../../utils/variant";

const normalizeAxisName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const toEntries = (value) => {
  if (!value) return [];
  if (value instanceof Map) return Array.from(value.entries());
  if (typeof value === "object") return Object.entries(value);
  return [];
};

const VariantSelector = ({ variants, onVariantChange, currentPrice }) => {
  const [selectedVariant, setSelectedVariant] = useState({});

  const axes = useMemo(() => {
    const dynamicAxes = Array.isArray(variants?.attributes)
      ? variants.attributes
          .map((attr) => ({
            label: String(attr?.name || "").trim(),
            key: normalizeAxisName(attr?.name),
            values: Array.isArray(attr?.values) ? attr.values : [],
          }))
          .filter((attr) => attr.label && attr.key && attr.values.length > 0)
      : [];
    if (dynamicAxes.length) return dynamicAxes;

    const fallback = [];
    const sizes = Array.isArray(variants?.sizes) ? variants.sizes : [];
    const colors = Array.isArray(variants?.colors) ? variants.colors : [];
    if (sizes.length) fallback.push({ label: "Size", key: "size", values: sizes });
    if (colors.length) fallback.push({ label: "Color", key: "color", values: colors });
    return fallback;
  }, [variants]);

  const getVariantStockValue = (selection) => {
    const entries = toEntries(variants?.stockMap);
    if (!entries.length) return null;
    const key = getVariantSignature(selection);
    if (!key) return null;

    const exact = entries.find(([rawKey]) => String(rawKey).trim() === key);
    if (exact) {
      const parsed = Number(exact[1]);
      if (Number.isFinite(parsed)) return parsed;
    }
    const normalized = entries.find(
      ([rawKey]) => String(rawKey).trim().toLowerCase() === key.toLowerCase()
    );
    if (normalized) {
      const parsed = Number(normalized[1]);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  useEffect(() => {
    const nextSelection = {};
    const defaultSelection = variants?.defaultSelection && typeof variants.defaultSelection === "object"
      ? variants.defaultSelection
      : {};
    axes.forEach((axis) => {
      const directDefault = String(defaultSelection?.[axis.key] || "").trim();
      const legacyDefault = axis.key === "size"
        ? String(variants?.defaultVariant?.size || "").trim()
        : axis.key === "color"
        ? String(variants?.defaultVariant?.color || "").trim()
        : "";
      const selected = directDefault || legacyDefault;
      if (selected) nextSelection[axis.key] = selected;
    });
    setSelectedVariant(nextSelection);
  }, [axes, variants]);

  useEffect(() => {
    onVariantChange?.(selectedVariant || {});
  }, [selectedVariant, onVariantChange]);

  if (!axes.length) return null;

  const handleOptionSelect = (axisKey, value) => {
    setSelectedVariant((prev) => {
      const isSame = String(prev?.[axisKey] || "") === String(value || "");
      const next = { ...(prev || {}) };
      if (isSame) {
        delete next[axisKey];
      } else {
        next[axisKey] = value;
      }
      return next;
    });
  };

  const isOptionAvailable = (axisKey, value) => {
    const previewSelection = { ...(selectedVariant || {}), [axisKey]: value };
    const stock = getVariantStockValue(previewSelection);
    return stock === null ? true : stock > 0;
  };

  const getVariantPrice = () => {
    const base = Number(currentPrice) || 0;
    const entries = toEntries(variants?.prices);
    if (!entries.length) return base;
    const key = getVariantSignature(selectedVariant || {});
    if (!key) return base;
    const exact = entries.find(([rawKey]) => String(rawKey).trim() === key);
    if (exact) {
      const parsed = Number(exact[1]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const normalized = entries.find(
      ([rawKey]) => String(rawKey).trim().toLowerCase() === key.toLowerCase()
    );
    if (normalized) {
      const parsed = Number(normalized[1]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return base;
  };

  return (
    <div className="space-y-2.5">
      {axes.map((axis) => (
        <div key={axis.key}>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
            {axis.label}:{" "}
            <span className="font-semibold normal-case text-gray-700">
              {selectedVariant?.[axis.key] || `Select ${axis.label.toLowerCase()}`}
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {axis.values.map((option) => {
              const isSelected = selectedVariant?.[axis.key] === option;
              const isAvailable = isOptionAvailable(axis.key, option);
              return (
                <button
                  key={`${axis.key}-${option}`}
                  onClick={() => handleOptionSelect(axis.key, option)}
                  disabled={!isAvailable}
                  className={`relative px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                    isSelected
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : isAvailable
                      ? "border-gray-200 hover:border-primary-400 bg-white text-gray-700"
                      : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  {option}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white" style={{ fontSize: 7 }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {getVariantPrice() !== Number(currentPrice || 0) && (
        <div className="px-2.5 py-1.5 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-[9px] text-gray-500 mb-0.5">Selected variant price:</p>
          <p className="text-sm font-bold text-primary-700">{formatPrice(getVariantPrice())}</p>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;

