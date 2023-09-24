import { getSession } from "next-auth/react";
import { type GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession({ ctx: context });

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
      props: {},
    };
  }

  return {
    props: {},
  };
};

export default function Dashboard() {
  return <div>Excel like Dashboard</div>;
}
