import UserMenu from "@/components/UserMenu";

export default function HeaderUserMenu(props: {
  name?: string;
  email?: string;
  image?: string;
  isLoggedIn: boolean;
}) {
  return <UserMenu {...props} />;
}
