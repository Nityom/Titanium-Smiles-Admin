import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
	...nextCoreWebVitals,
	...nextTypescript,
	{
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"react/no-unescaped-entities": "off",
			"prefer-const": "off",
			"react-hooks/exhaustive-deps": "warn",
			"@next/next/no-img-element": "warn",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/purity": "off"
		}
	}
];

export default eslintConfig;
