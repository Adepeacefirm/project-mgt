import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentWorkspace,
  syncWorkspaces,
} from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganizationList } from "@clerk/clerk-react";

function WorkspaceDropdown() {
  const { setActive, userMemberships, isLoaded } = useOrganizationList({
    userMemberships: true,
  });

  const { openCreateOrganization } = useClerk();

  const { workspaces } = useSelector((state) => state.workspace);
  const currentWorkspace = useSelector(
    (state) => state.workspace?.currentWorkspace,
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
  if (!isLoaded || !userMemberships.data) return;

  // 1. Transform Clerk data
  const plainWorkspaces = userMemberships.data.map(({ organization }) => ({
    id: organization.id,
    name: organization.name,
    imageUrl: organization.imageUrl,
    projects: [], 
  }));

  // 2. ONLY sync if the length or first ID has changed to prevent infinite loops
  if (workspaces.length !== plainWorkspaces.length || workspaces[0]?.id !== plainWorkspaces[0]?.id) {
    dispatch(syncWorkspaces(plainWorkspaces));
  }

  // 3. Auto-select logic with a strict guard
  const savedId = localStorage.getItem("currentWorkspaceId");
  if (!currentWorkspace && plainWorkspaces.length > 0) {
    const toSelect = plainWorkspaces.find((w) => w.id === savedId) || plainWorkspaces[0];
    dispatch(setCurrentWorkspace(toSelect));
  }
}, [isLoaded, userMemberships.data, dispatch, currentWorkspace, workspaces]); 
// Added 'workspaces' to dependencies so we can compare lengths

  const onSelectWorkspace = async (org) => {
    await setActive({ organization: org.id });

    // Pass a PLAIN object to avoid the non-serializable error
    dispatch(setCurrentWorkspace(org.id));

    setIsOpen(false);
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded)
    return <div className="m-4 animate-pulse h-12 bg-gray-200 rounded" />;

  const memberships = userMemberships.data || [];

  return (
    <div className="relative m-4" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-3">
          <img
            src={currentWorkspace?.imageUrl}
            alt={currentWorkspace?.name}
            className="w-8 h-8 rounded shadow"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
              {currentWorkspace?.name || "Select Workspace"}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
          <section className="p-2">
            <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
              Workspaces
            </p>
            {memberships?.map(({ organization }) => (
              <div
                key={organization.id}
                onClick={() => onSelectWorkspace(organization)}
                className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <img
                  src={organization.imageUrl}
                  alt={organization.name}
                  className="w-6 h-6 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {organization?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {organization?.membersCount || 0} members
                  </p>
                </div>
                {currentWorkspace?.id === organization.id && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </section>

          <hr className="border-gray-200 dark:border-zinc-700" />

          <div
            onClick={() => {
              openCreateOrganization();
              setIsOpen(false);
            }}
            className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
              <Plus className="w-4 h-4" /> Create Workspace
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceDropdown;
