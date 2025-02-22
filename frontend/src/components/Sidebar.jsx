import LibraryView from "./LibraryView";
import Recorder from "./Recorder";

const Sidebar = ({ addSoundInstance }) => {
  return <div className="bg-stone-800 flex flex-col max-h-dvh">
    <LibraryView addSoundInstance={addSoundInstance} />
    <Recorder />
  </div>
}
export default Sidebar;
