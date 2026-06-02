import katex, { type KatexOptions } from "katex";
import "katex/dist/katex.min.css";
import { type JSX, splitProps } from "solid-js";

interface Props
	extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children">,
		KatexOptions {
	math: string;
}

export function Katex(props: Props) {
	const [local, others] = splitProps(props, ["math", "displayMode"]);
	const html = () =>
		katex.renderToString(local.math, { displayMode: local.displayMode });

	return <span innerHTML={html()} {...others} />;
}
