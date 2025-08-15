import React from 'react'
import { View, Text, StyleSheet} from 'react-native'

export default function FloatingBadge() {
     return (
          <View style={styles.floatingButton}>
               <Text style={styles.badgeText}>Powered by Right Apps</Text>
          </View>
     )
}



const styles = StyleSheet.create({
     floatingButton: {
       position: 'absolute',
       width: 60,
       height: 60,
       alignItems: 'center',
       justifyContent: 'center',
       right: 20,
       bottom: 20,
       backgroundColor: '#03A9F4',
       borderRadius: 30,
       elevation: 8, // for Android shadow
       shadowColor: '#000', // for iOS shadow
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.25,
       shadowRadius: 3.84,
     },
     badgeText: {
       color: 'white',
       fontSize: 20,
       fontWeight: 'bold',
     },
   });