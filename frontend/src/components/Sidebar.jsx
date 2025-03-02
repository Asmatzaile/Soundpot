import LibraryView from "./LibraryView";
import Recorder from "./Recorder";
import Trash from "./Trash";

const Sidebar = ({ instanceManager }) => {
  return <div className="bg-stone-800 flex flex-col max-h-dvh">
    <LibraryView instanceManager={ instanceManager } />
    <div className="p-1 grid grid-cols-2 place-items-center">
      <Recorder instanceManager={ instanceManager }/>
      <Trash />
    </div>
  </div>
}
export default Sidebar;
