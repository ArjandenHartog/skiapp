"use client";
import dynamic from "next/dynamic";

const SkiMetrics = dynamic(() => import('../components/SkiMetrics'), {
  ssr: false
});

export default function ClientSkiMetrics() {
  return <SkiMetrics />;
}