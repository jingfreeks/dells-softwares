import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView } from "expo-camera";
import { useBarcodeScannerModal } from "./hooks";
import type { BarcodeScannerModalProps } from "./types";

export function BarcodeScannerModal({ visible, onDetected, onClose }: BarcodeScannerModalProps) {
  const { permission, requestPermission, handleScan, resetHandled } = useBarcodeScannerModal(onDetected);

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 justify-center items-center p-6 gap-4">
          <Text className="text-center text-base text-[#0f172a]">Camera access is needed to scan barcodes.</Text>
          <TouchableOpacity className="bg-[#0f172a] rounded-xl py-3 px-6" onPress={requestPermission}>
            <Text className="text-white font-semibold">Grant permission</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[rgba(15,23,42,0.85)] rounded-[20px] py-2 px-5" onPress={onClose}>
            <Text className="text-white font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={resetHandled}>
      <View className="flex-1 bg-black">
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
          }}
          onBarcodeScanned={handleScan}
        />
        <View className="absolute top-12 left-0 right-0 items-center">
          <TouchableOpacity className="bg-[rgba(15,23,42,0.85)] rounded-[20px] py-2 px-5" onPress={onClose}>
            <Text className="text-white font-semibold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
