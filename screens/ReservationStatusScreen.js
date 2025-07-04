import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

//const TIMER_DURATION_MINUTES = 30;

export default function ReservationStatusScreen({ navigation }) {
  const [reservation, setReservation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerExpired, setTimerExpired] = useState(false);
  const [garageName, setGarageName] = useState("Loading...");

  useEffect(() => {
    const fetchReservation = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const reservationsRef = collection(db, "Reservations");
        const q = query(reservationsRef, where("userID", "==", user.uid), where("status", "==", "held"));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const resDoc = querySnapshot.docs[0];
          const resData = resDoc.data();
          setReservation({ id: resDoc.id, ...resData });

          // Get startTime and endTime from reservation document
          const startTime = resData.startTime.toDate();
          const endTime = resData.endTime.toDate();
          updateTimer(startTime, endTime);

          // Get the garage name from the parking spot collection
          const spotId = resData.spotId;
          const collections = [
            { name: "parkingSpotsTrop", displayName: "Tropicana Garage" },
            { name: "parkingSpotsGateway", displayName: "Gateway Garage" },
            { name: "parkingSpotsCottage", displayName: "Cottage Grove Garage" },
          ];

          for (const col of collections) {
            try {
              const spotRef = doc(db, col.name, spotId);
              const spotSnap = await getDoc(spotRef);
              if (spotSnap.exists()) {
                setGarageName(col.displayName);
                break;
              }
            } catch (error) {
              console.error(`Error checking collection ${col.name}:`, error);
            }
          }
        } else {
          setReservation(null);
        }
      } catch (error) {
        console.error("Error fetching reservation:", error);
      }
      setLoading(false);
    };

    fetchReservation();
  }, []);

  // Function to update the timer
  const updateTimer = (startTime, endTime) => {
    const now = new Date();
    const diff = endTime - now;

    if (diff <= 0) {
      if (!timerExpired && reservation) {
        setTimerExpired(true);
        setTimeLeft({ minutes: "00", seconds: "00", expired: true });

        try {
          // Auto-delete expired reservation
          deleteDoc(doc(db, "Reservations", reservation.id));
          setReservation(null);
          console.log("Expired reservation auto-deleted");
        } catch (error) {
          console.error("Error auto-deleting expired reservation:", error);
        }
      }
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        minutes: minutes < 10 ? `0${minutes}` : `${minutes}`,
        seconds: seconds < 10 ? `0${seconds}` : `${seconds}`,
        expired: false,
      });
    }
  };

  // Timer refresh interval
  useEffect(() => {
    if (!reservation) return;

    const interval = setInterval(() => {
      const startTime = reservation.startTime.toDate();
      const endTime = reservation.endTime.toDate();
      updateTimer(startTime, endTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation]);

  const handleCancel = () => {
    if (timerExpired || !reservation) {
      console.log("Reservation already expired or does not exist.");
      return;
    }

    Alert.alert(
      "Cancel Reservation",
      "Are you sure you want to cancel your current reservation?",
      [
        {
          text: "No",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "Reservations", reservation.id));
              setReservation(null);
              console.log("Reservation canceled and deleted");
            } catch (error) {
              console.error("Error canceling reservation:", error);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Reservation Status</Text>
      </View>

      <TouchableOpacity style={styles.backWrapper} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : reservation ? (
        <>
          <Text style={styles.label}>Parking Garage:</Text>
          <View style={styles.inputBox}><Text>{garageName}</Text></View>

          <Text style={styles.label}>Parking Spot Number:</Text>
          <View style={styles.inputBox}><Text>{reservation.spotId}</Text></View>

          <Text style={styles.timerLabel}>Reservation Timer:</Text>

          {/* Check if timeLeft exists before rendering timer */}
          {timeLeft ? (
            <View style={[styles.timerBox, timeLeft.expired && styles.expiredTimerBox]}>
              <Text style={[styles.timerText, timeLeft.expired && styles.expiredTimerText]}>
                {timeLeft.minutes} : {timeLeft.seconds}
              </Text>
              <Text style={styles.dateText}>{reservation.startTime.toDate().toDateString()}</Text>
            </View>
          ) : (
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>Loading...</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.noReservationText}>No current reservation at this time.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
  },
  header: {
    width: "100%",
    backgroundColor: "#CC0000",
    height: 80,
    justifyContent: 'center',
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerText: {
    fontSize: 27,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "black",
    textShadowOffset: { width: 3, height: 1 },
    textShadowRadius: 5,
  },
  backWrapper: {
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 5
  },
  backText: {
    fontSize: 16,
    color:'#CC0000'
  },
  inputBox: {
    width: "90%",
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  timerLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
  },
  timerBox: {
    width: 150,
    height: 80,
    backgroundColor: "gray",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
  },
  expiredTimerBox: {
    backgroundColor: "#CC0000",
  },
  timerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  expiredTimerText: {
    color: "yellow",
  },
  dateText: {
    color: "white",
    marginTop: 5,
  },
  cancelButton: {
    marginTop: 20,
  },
  cancelButtonText: {
    color: "#CC0000",
    textDecorationLine: "underline",
    fontSize: 16,
  },
  noReservationText: {
    fontSize: 16,
    color: "gray",
    marginTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "gray",
    marginTop: 50,
  },
});


