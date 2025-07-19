import { Stack } from 'expo-router';
import { View } from 'react-native';
const index = () => {
  return (
    <View>
      <Stack.Screen
          options={{
            headerTitle: '',     
            headerShadowVisible: false,
          }}
        />
    </View>
  )
}

export default index