import { useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";

interface Props {
  visible: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ visible, onDetected, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  // Debounce: the scanner fires repeatedly for the same code while it's in
  // frame — only act on the first hit per time the modal opens.
  const handledRef = useRef(false);

  function handleScan(result: BarcodeScanningResult) {
    if (handledRef.current) return;
    handledRef.current = true;
    onDetected(result.data);
  }

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <Text style={styles.message}>Camera access is needed to scan barcodes.</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        handledRef.current = false;
      }}
    >
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
          }}
          onBarcodeScanned={handleScan}
        />
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { position: "absolute", top: 48, left: 0, right: 0, alignItems: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  message: { textAlign: "center", fontSize: 16, color: "#0f172a" },
  button: { backgroundColor: "#0f172a", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
  closeButton: {
    backgroundColor: "rgba(15,23,42,0.85)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  closeButtonText: { color: "#fff", fontWeight: "600" },
});
