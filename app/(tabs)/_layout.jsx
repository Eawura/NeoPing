import { AntDesign} from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Fontisto from '@expo/vector-icons/Fontisto';


const _layout = () => {
  return (
 <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2E45A3',
          tabBarStyle: {
            backgroundColor: '#000',
            borderColor: '#000',
          },

          headerStyle: {
            backgroundColor: '#000',
            height: 150,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
            <Fontisto name="home" size={24} color={color} /> ),
          }}
        />

        <Tabs.Screen
          name="communities"
          options={{
            title: 'Communities',
            tabBarIcon: ({ color }) => (
             <Ionicons name="people-circle-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: ({ color }) => (
            <AntDesign name="plus" size={24} color={color} />),
          }}
        />

          <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="inbox"
          options={{
            title: 'inbox',
            tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="bell-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
      

  )
}

export default _layout
const styles =StyleSheet.create({

  asareStyle:{
color:'#000',
marginTop:400,
marginLeft:150,
  },
})