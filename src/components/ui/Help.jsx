// A single explanatory sentence, folded behind a mark. Panels used to carry
// these as standing paragraphs, which turned every list into prose; the words
// are unchanged, they just wait to be asked for.
export default function Help({ text, className = '' }) {
  return <span className={`ed-help ${className}`} data-tip={text} role="img" aria-label={text}>?</span>
}
