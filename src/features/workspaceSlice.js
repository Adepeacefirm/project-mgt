import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk(
  "workspace/fetchWorkspaces",
  async ({ getToken }) => {
    try {
      const { data } = await api.get("/api/workspaces", {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      return data.workspaces || [];
    } catch (error) {
      console.log(error);
      return [];
    }
  },
);

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },

    // Inside your reducers object in workspaceSlice.js
    setMembers: (state, action) => {
      if (state.currentWorkspace) {
        // This adds the 'members' key to the object you logged
        state.currentWorkspace.members = action.payload;
      }
    },

    syncWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },

    // setCurrentWorkspace: (state, action) => {
    //   const id = action.payload;
    //   if (!id) return;

    //   localStorage.setItem("currentWorkspaceId", id);

    //   const found = state.workspaces.find((w) => w.id === id);

    //   // Only set when API data is present
    //   if (found) {
    //     state.currentWorkspace = found;
    //   } else {
    //     // IMPORTANT: clear stale Clerk object
    //     state.currentWorkspace = null;
    //   }
    // },

    setCurrentWorkspace: (state, action) => {
      const payload = action.payload;

      const id = typeof payload === "string" ? payload : payload?.id;

      if (id) {
        localStorage.setItem("currentWorkspaceId", id);
        const found = state.workspaces.find((w) => w.id === id);

        // If we found it in the list (with projects), use it.
        // Otherwise, use the object passed in (from Clerk).

        if (found) {
          state.currentWorkspace = found;
        }
        // || (typeof payload === "object" ? payload : null);
      }
    },

    //     setMembers: (state, action) => {
    //   // 1. Update the list inside the current workspace
    //   if (state.currentWorkspace) {
    //     state.currentWorkspace.members = action.payload;
    //   }
    //   // 2. Also update the workspace in the main array so data stays consistent
    //   state.workspaces = state.workspaces.map((w) =>
    //     w.id === state.currentWorkspace?.id ? { ...w, members: action.payload } : w
    //   );
    // },

    // setCurrentWorkspace: (state, action) => {
    //   localStorage.setItem("currentWorkspaceId", action.payload);
    //   state.currentWorkspace = state.workspaces.find(
    //     (w) => w.id === action.payload
    //   );
    // },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);

      // set current workspace to the new workspace
      if (state.currentWorkspace?.id !== action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    updateWorkspace: (state, action) => {
      state.workspaces = state.workspaces.map((w) =>
        w.id === action.payload.id ? action.payload : w,
      );

      // if current workspace is updated, set it to the updated workspace
      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    deleteWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(
        (w) => w._id !== action.payload,
      );
    },
    addProject: (state, action) => {
      state?.currentWorkspace?.projects.push(action.payload);
      // find workspace by id and add project to it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? { ...w, projects: w.projects?.concat(action.payload) }
          : w,
      );
    },
    addTask: (state, action) => {
      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          console.log(
            p.id,
            action.payload.projectId,
            p.id === action.payload.projectId,
          );
          if (p.id === action.payload.projectId) {
            p.tasks.push(action.payload);
          }
          return p;
        },
      );

      // find workspace and project by id and add task to it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? { ...p, tasks: p.tasks.concat(action.payload) }
                  : p,
              ),
            }
          : w,
      );
    },
    updateTask: (state, action) => {
      state.currentWorkspace.projects.map((p) => {
        if (p.id === action.payload.projectId) {
          p.tasks = p.tasks.map((t) =>
            t.id === action.payload.id ? action.payload : t,
          );
        }
      });
      // find workspace and project by id and update task in it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t,
                      ),
                    }
                  : p,
              ),
            }
          : w,
      );
    },
    deleteTask: (state, action) => {
      state.currentWorkspace.projects.map((p) => {
        p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
        return p;
      });
      // find workspace and project by id and delete task from it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.filter(
                        (t) => !action.payload.includes(t.id),
                      ),
                    }
                  : p,
              ),
            }
          : w,
      );
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      const apiWorkspaces = action.payload || [];

      // If the API returns data, we want to merge it with what's already in state (from Clerk)
      // This ensures we keep the Clerk 'id' and 'name' but add 'projects' from the API
      state.workspaces = state.workspaces.map((existing) => {
        const apiMatch = apiWorkspaces.find((w) => w.id === existing.id);
        // return apiMatch ? { ...existing, ...apiMatch } : existing;
        if (apiMatch) {
          // MERGE logic: Keep existing members if the API match doesn't have them
          return {
            ...existing,
            ...apiMatch,
            members: apiMatch.members || existing.members || [],
          };
        }
        return existing;
      });

      if (state.currentWorkspace) {
        const updated = state.workspaces.find(
          (w) => w.id === state.currentWorkspace.id,
        );
        if (updated) state.currentWorkspace = updated;
      }

      // If Redux was empty (e.g. syncWorkspaces hadn't run), just use API data
      if (state.workspaces.length === 0) {
        state.workspaces = apiWorkspaces;
      }

      // Handle current workspace selection
      const localStorageCurrentWorkspaceId =
        localStorage.getItem("currentWorkspaceId");
      if (localStorageCurrentWorkspaceId) {
        const findWorkspace = state.workspaces.find(
          (w) => w.id === localStorageCurrentWorkspaceId,
        );
        if (findWorkspace) {
          state.currentWorkspace = findWorkspace;
        }
      } else if (!state.currentWorkspace && state.workspaces.length > 0) {
        state.currentWorkspace = state.workspaces[0];
      }

      state.loading = false;
      state.fetched = true;
      //   state.workspaces = action.payload;
      //   if (action.payload.length > 0) {
      //     const localStorageCurrentWorkspaceId =
      //       localStorage.getItem("currentWorkspaceId");
      //     if (localStorageCurrentWorkspaceId) {
      //       const findWorkspace = action.payload.find(
      //         (w) => w.id === localStorageCurrentWorkspaceId
      //       );
      //       state.currentWorkspace = findWorkspace || action.payload[0];
      //     }
      //     state.loading = false;
      //     state.fetched = true;
      //   }
    });

    builder.addCase(fetchWorkspaces.rejected, (state) => {
      state.loading = false;
      state.fetched = true;
    });
  },
});

export const {
  setWorkspaces,
  setCurrentWorkspace,
  setMembers,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addProject,
  addTask,
  updateTask,
  deleteTask,
  syncWorkspaces,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;
