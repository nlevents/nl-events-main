import { useState, useEffect } from "react";
import { getProducts, getProduct } from "../lib/catalogStore";
import { listAllProducts } from "../data/occasions";

export function useLiveProducts() {
  const [products, setProducts] = useState(getProducts);

  useEffect(() => {
    const onUpdate = () => setProducts(getProducts());
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  return products;
}

export function useLiveEntries() {
  const [entries, setEntries] = useState(listAllProducts);

  useEffect(() => {
    const onUpdate = () => setEntries(listAllProducts());
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  return entries;
}

export function useLiveProduct(id) {
  const [product, setProduct] = useState(() => getProduct(id));

  useEffect(() => {
    setProduct(getProduct(id));
    const onUpdate = () => setProduct(getProduct(id));
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, [id]);

  return product;
}
