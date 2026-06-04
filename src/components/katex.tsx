import katex, { type KatexOptions } from "katex";
import "katex/dist/katex.min.css";
import { type JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

interface Props
	extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children">,
		KatexOptions {
	math: string;
	as?: "span" | "p";
}

export function Katex(props: Props) {
	const [local, others] = splitProps(props, ["math", "displayMode", "as"]);
	const html = () =>
		katex.renderToString(local.math, { displayMode: local.displayMode });

	return (
		<Dynamic component={local.as || "span"} innerHTML={html()} {...others} />
	);
}
