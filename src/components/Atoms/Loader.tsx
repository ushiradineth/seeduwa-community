import { LoaderIcon } from "lucide-react";

function Loader(props: { background?: boolean; height?: string; removeBackgroundColor?: boolean }) {
  if (props.background) {
    return (
      <div
        style={{ height: props.height ?? "100vh" }}
        className={`flex flex-col items-center justify-center ${!props.removeBackgroundColor && "bg-bgc"}`}>
        <LoaderIcon className="animate-spin" color="white" />
      </div>
    );
  }

  return <LoaderIcon className="animate-spin" />;
}

export default Loader;
