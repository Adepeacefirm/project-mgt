import { useEffect } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import { setMembers } from "../features/workspaceSlice";

const MemberSync = () => {
  const dispatch = useDispatch();
  // This hook gets the actual user list from Clerk
  const { organization, isLoaded } = useOrganization({
    memberships: {
      data: true // We must tell Clerk to fetch the user data
    }
  });

  useEffect(() => {
    if (isLoaded && organization?.memberships?.data) {
      // We format the Clerk data into a simple list for our Form
      const formattedMembers = organization.memberships.data.map((m) => ({
        id: m.publicUserData.userId,
        name: `${m.publicUserData.firstName || ""} ${m.publicUserData.lastName || ""}`.trim(),
        email: m.publicUserData.identifier, // This is usually their email
        imageUrl: m.publicUserData.imageUrl,
      }));

      // Send this list to Redux
      dispatch(setMembers(formattedMembers));
    }
  }, [organization?.memberships?.data, isLoaded, dispatch]);

  return null; // This component doesn't show anything on screen
};

export default MemberSync;