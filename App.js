import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FirstPage from "./app/FirstPage";
import React from "react";
import myMusic from "./app/myMusic";
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="FirstPage"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="FirstPage" component={FirstPage} />
        <Stack.Screen name="myMusic" component={myMusic} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
