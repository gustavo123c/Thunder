import { Redirect } from 'expo-router';

// Etapa 1 will route unauthenticated users to (auth)/sign-in here.
export default function Index() {
  return <Redirect href="/feed" />;
}
