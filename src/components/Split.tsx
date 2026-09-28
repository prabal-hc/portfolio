import { Fragment } from "react";

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

/** Words that blur-rise in one after another when their <Reveal> comes into view (styles: .split-w in globals.css). */
export function SplitWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="split-w" style={{ "--i": i, "--d": `${delay}ms` } as Vars}>
              {w}
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </>
  );
}

/** Same, letter by letter; words never break across lines. */
export function SplitChars({ text, delay = 0, stagger = 45 }: { text: string; delay?: number; stagger?: number }) {
  const words = text.split(" ");
  const starts = words.map((_, wi) => words.slice(0, wi).reduce((n, w) => n + w.length, 0));
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, wi) => (
          <Fragment key={wi}>
            <span className="inline-block whitespace-nowrap">
              {[...w].map((c, ci) => (
                <span key={ci} className="split-c" style={{ "--i": starts[wi] + ci, "--s": `${stagger}ms`, "--d": `${delay}ms` } as Vars}>
                  {c}
                </span>
              ))}
            </span>
            {wi < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </>
  );
}
