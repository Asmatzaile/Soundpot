import LibraryView from "./LibraryView";
import Recorder from "./Recorder";
import Trash from "./Trash";

const Sidebar = ({ instanceManager }) => {
  return <div className="bg-stone-800 flex flex-col max-h-dvh">
    <LibraryView instanceManager={ instanceManager } />
    <div className="grid grid-cols-2 p-4">
      <Recorder instanceManager={ instanceManager }/>
      <Trash />
    </div>
  </div>
}
export default Sidebar;
