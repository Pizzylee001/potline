import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.default)) return value.default;
  return [];
}

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "lib/abis/**",
    ],
  },
  ...asArray(coreWebVitals),
  ...asArray(typescript),
];

export default eslintConfig;
