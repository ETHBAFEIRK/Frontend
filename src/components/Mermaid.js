import mermaid from "mermaid";
import { useEffect } from "react";

mermaid.initialize({});

const Mermaid = ({ chart, id }) => {
  useEffect(() => {
    document.getElementById(id)?.removeAttribute("data-processed");
    mermaid.contentLoaded();
  }, [chart, id]);

  return (
    <div className="mermaid" id={id}>
      {chart}
    </div>
  );
};

export default Mermaid;
