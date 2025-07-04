import { doc, setDoc, getFirestore } from 'firebase/firestore'

const db = getFirestore()

const initializeParkingCollections = async () => {
  const collections = {
    // parkingSpotsTrop: 20,
    parkingSpotsCottage: 11,
    parkingSpotsGateway: 10
  }

  try {
    for (const [collectionName, spotCount] of Object.entries(collections)) {
      for (let i = 1; i <= spotCount; i++) {
        const spotRef = doc(db, collectionName, `spot${i}`)
        await setDoc(spotRef, {
          location: i,
          status: 'available',
          heldBy: '',
          holdExpiresAt: null,
          type: i % 5 === 0 ? 'accessible' : i % 2 === 0 ? 'staff' : 'student'
        })
      }
    }

    console.log('✅ Parking collections initialized successfully.')
    return true
  } catch (error) {
    console.error('❌ Error initializing parking collections:', error)
    return false
  }
}

export default initializeParkingCollections
