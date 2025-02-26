import LibraryView from "./LibraryView";
import Recorder from "./Recorder";
import Thrash from "./Thrash";

const Sidebar = ({ addSoundInstance }) => {
  return <div className="bg-stone-800 flex flex-col max-h-dvh">
    <LibraryView addSoundInstance={addSoundInstance} />
    <div className="grid grid-cols-2">
      <Recorder />
      <Thrash />
    </div>
  </div>
}
export default Sidebar;
