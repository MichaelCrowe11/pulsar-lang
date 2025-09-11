// Pulsar Device Drivers - CAN, Serial, Ethernet
// Real-time deterministic communication for robotics and embedded systems

use crate::rt::{Micros, Time};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

// ============================================================================
// CAN Bus Driver (Controller Area Network)
// ============================================================================

#[derive(Clone, Debug)]
pub struct CANFrame {
    pub id: u32,
    pub data: [u8; 8],
    pub dlc: u8,  // Data Length Code
    pub is_extended: bool,
    pub is_rtr: bool,  // Remote Transmission Request
    pub timestamp_us: Micros,
}

#[derive(Clone, Debug)]
pub enum CANBitrate {
    Kbps125,
    Kbps250,
    Kbps500,
    Mbps1,
    Mbps2,
    Mbps5,
    Mbps8,  // CAN FD
}

impl CANBitrate {
    pub fn to_bps(&self) -> u32 {
        match self {
            CANBitrate::Kbps125 => 125_000,
            CANBitrate::Kbps250 => 250_000,
            CANBitrate::Kbps500 => 500_000,
            CANBitrate::Mbps1 => 1_000_000,
            CANBitrate::Mbps2 => 2_000_000,
            CANBitrate::Mbps5 => 5_000_000,
            CANBitrate::Mbps8 => 8_000_000,
        }
    }
}

pub struct CANDriver {
    interface: String,
    bitrate: CANBitrate,
    tx_queue: Arc<Mutex<VecDeque<CANFrame>>>,
    rx_queue: Arc<Mutex<VecDeque<CANFrame>>>,
    max_tx_queue: usize,
    max_rx_queue: usize,
    error_count: Arc<Mutex<CANErrorCounters>>,
    filters: Vec<CANFilter>,
    max_latency_us: Micros,
}

#[derive(Clone, Debug, Default)]
pub struct CANErrorCounters {
    pub tx_errors: u32,
    pub rx_errors: u32,
    pub bus_off_count: u32,
    pub arbitration_lost: u32,
    pub crc_errors: u32,
}

#[derive(Clone, Debug)]
pub struct CANFilter {
    pub id: u32,
    pub mask: u32,
    pub is_extended: bool,
}

impl CANDriver {
    pub fn new(interface: &str, bitrate: CANBitrate) -> Self {
        Self {
            interface: interface.to_string(),
            bitrate,
            tx_queue: Arc::new(Mutex::new(VecDeque::new())),
            rx_queue: Arc::new(Mutex::new(VecDeque::new())),
            max_tx_queue: 100,
            max_rx_queue: 100,
            error_count: Arc::new(Mutex::new(CANErrorCounters::default())),
            filters: Vec::new(),
            max_latency_us: 1000,  // 1ms default
        }
    }
    
    pub fn init(&mut self) -> Result<(), String> {
        // Initialize CAN hardware/interface
        // In real implementation, this would configure the hardware
        println!("Initializing CAN interface {} at {} bps", self.interface, self.bitrate.to_bps());
        Ok(())
    }
    
    pub fn send_frame(&mut self, frame: CANFrame) -> Result<(), String> {
        let start = Instant::now();
        
        let mut queue = self.tx_queue.lock().map_err(|e| e.to_string())?;
        
        if queue.len() >= self.max_tx_queue {
            return Err("TX queue full".to_string());
        }
        
        queue.push_back(frame);
        
        // Check real-time constraint
        let elapsed_us = start.elapsed().as_micros() as u64;
        if elapsed_us > self.max_latency_us {
            return Err(format!("CAN send exceeded latency: {} > {} us", elapsed_us, self.max_latency_us));
        }
        
        Ok(())
    }
    
    pub fn receive_frame(&mut self) -> Result<Option<CANFrame>, String> {
        let start = Instant::now();
        
        let mut queue = self.rx_queue.lock().map_err(|e| e.to_string())?;
        let frame = queue.pop_front();
        
        // Check real-time constraint
        let elapsed_us = start.elapsed().as_micros() as u64;
        if elapsed_us > self.max_latency_us {
            return Err(format!("CAN receive exceeded latency: {} > {} us", elapsed_us, self.max_latency_us));
        }
        
        Ok(frame)
    }
    
    pub fn add_filter(&mut self, filter: CANFilter) {
        self.filters.push(filter);
    }
    
    pub fn get_error_counters(&self) -> Result<CANErrorCounters, String> {
        let counters = self.error_count.lock().map_err(|e| e.to_string())?;
        Ok(counters.clone())
    }
    
    pub fn set_max_latency(&mut self, max_us: Micros) {
        self.max_latency_us = max_us;
    }
}

// CANopen protocol support
pub mod canopen {
    use super::*;
    
    #[derive(Clone, Debug)]
    pub enum SDOCommand {
        Download,
        Upload,
        Abort,
    }
    
    #[derive(Clone, Debug)]
    pub struct SDO {
        pub command: SDOCommand,
        pub index: u16,
        pub subindex: u8,
        pub data: Vec<u8>,
    }
    
    #[derive(Clone, Debug)]
    pub struct PDO {
        pub cob_id: u32,
        pub data: [u8; 8],
        pub sync_counter: u8,
    }
    
    pub struct CANopenNode {
        node_id: u8,
        can_driver: CANDriver,
        object_dictionary: ObjectDictionary,
        heartbeat_period_ms: u32,
        last_heartbeat: Instant,
    }
    
    pub struct ObjectDictionary {
        entries: std::collections::HashMap<(u16, u8), Vec<u8>>,
    }
    
    impl CANopenNode {
        pub fn new(node_id: u8, can_driver: CANDriver) -> Self {
            Self {
                node_id,
                can_driver,
                object_dictionary: ObjectDictionary {
                    entries: std::collections::HashMap::new(),
                },
                heartbeat_period_ms: 1000,
                last_heartbeat: Instant::now(),
            }
        }
        
        pub fn send_heartbeat(&mut self) -> Result<(), String> {
            let frame = CANFrame {
                id: 0x700 + self.node_id as u32,
                data: [0x05, 0, 0, 0, 0, 0, 0, 0],  // Operational state
                dlc: 1,
                is_extended: false,
                is_rtr: false,
                timestamp_us: 0,
            };
            
            self.can_driver.send_frame(frame)
        }
    }
}

// ============================================================================
// Serial/UART Driver
// ============================================================================

#[derive(Clone, Debug)]
pub enum SerialBaudrate {
    Baud9600,
    Baud19200,
    Baud38400,
    Baud57600,
    Baud115200,
    Baud230400,
    Baud460800,
    Baud921600,
    Custom(u32),
}

impl SerialBaudrate {
    pub fn to_bps(&self) -> u32 {
        match self {
            SerialBaudrate::Baud9600 => 9600,
            SerialBaudrate::Baud19200 => 19200,
            SerialBaudrate::Baud38400 => 38400,
            SerialBaudrate::Baud57600 => 57600,
            SerialBaudrate::Baud115200 => 115200,
            SerialBaudrate::Baud230400 => 230400,
            SerialBaudrate::Baud460800 => 460800,
            SerialBaudrate::Baud921600 => 921600,
            SerialBaudrate::Custom(rate) => *rate,
        }
    }
}

#[derive(Clone, Debug)]
pub enum Parity {
    None,
    Even,
    Odd,
    Mark,
    Space,
}

#[derive(Clone, Debug)]
pub enum DataBits {
    Five,
    Six,
    Seven,
    Eight,
}

#[derive(Clone, Debug)]
pub enum StopBits {
    One,
    OnePointFive,
    Two,
}

#[derive(Clone, Debug)]
pub struct SerialConfig {
    pub baudrate: SerialBaudrate,
    pub data_bits: DataBits,
    pub parity: Parity,
    pub stop_bits: StopBits,
    pub flow_control: bool,
}

impl Default for SerialConfig {
    fn default() -> Self {
        Self {
            baudrate: SerialBaudrate::Baud115200,
            data_bits: DataBits::Eight,
            parity: Parity::None,
            stop_bits: StopBits::One,
            flow_control: false,
        }
    }
}

pub struct SerialDriver {
    port: String,
    config: SerialConfig,
    tx_buffer: Arc<Mutex<Vec<u8>>>,
    rx_buffer: Arc<Mutex<Vec<u8>>>,
    max_buffer_size: usize,
    max_latency_us: Micros,
    frame_timeout_us: Micros,
}

impl SerialDriver {
    pub fn new(port: &str, config: SerialConfig) -> Self {
        Self {
            port: port.to_string(),
            config,
            tx_buffer: Arc::new(Mutex::new(Vec::new())),
            rx_buffer: Arc::new(Mutex::new(Vec::new())),
            max_buffer_size: 4096,
            max_latency_us: 1000,
            frame_timeout_us: 10000,  // 10ms
        }
    }
    
    pub fn init(&mut self) -> Result<(), String> {
        println!("Initializing serial port {} at {} bps", self.port, self.config.baudrate.to_bps());
        Ok(())
    }
    
    pub fn write(&mut self, data: &[u8]) -> Result<usize, String> {
        let start = Instant::now();
        
        let mut buffer = self.tx_buffer.lock().map_err(|e| e.to_string())?;
        
        if buffer.len() + data.len() > self.max_buffer_size {
            return Err("TX buffer overflow".to_string());
        }
        
        buffer.extend_from_slice(data);
        
        // Check real-time constraint
        let elapsed_us = start.elapsed().as_micros() as u64;
        if elapsed_us > self.max_latency_us {
            return Err(format!("Serial write exceeded latency: {} > {} us", elapsed_us, self.max_latency_us));
        }
        
        Ok(data.len())
    }
    
    pub fn read(&mut self, max_bytes: usize) -> Result<Vec<u8>, String> {
        let start = Instant::now();
        
        let mut buffer = self.rx_buffer.lock().map_err(|e| e.to_string())?;
        let bytes_to_read = max_bytes.min(buffer.len());
        let data: Vec<u8> = buffer.drain(..bytes_to_read).collect();
        
        // Check real-time constraint
        let elapsed_us = start.elapsed().as_micros() as u64;
        if elapsed_us > self.max_latency_us {
            return Err(format!("Serial read exceeded latency: {} > {} us", elapsed_us, self.max_latency_us));
        }
        
        Ok(data)
    }
    
    pub fn flush_tx(&mut self) -> Result<(), String> {
        let mut buffer = self.tx_buffer.lock().map_err(|e| e.to_string())?;
        buffer.clear();
        Ok(())
    }
    
    pub fn flush_rx(&mut self) -> Result<(), String> {
        let mut buffer = self.rx_buffer.lock().map_err(|e| e.to_string())?;
        buffer.clear();
        Ok(())
    }
}

// Modbus RTU protocol over serial
pub mod modbus_rtu {
    use super::*;
    
    #[derive(Clone, Debug)]
    pub enum ModbusFunction {
        ReadCoils = 0x01,
        ReadDiscreteInputs = 0x02,
        ReadHoldingRegisters = 0x03,
        ReadInputRegisters = 0x04,
        WriteSingleCoil = 0x05,
        WriteSingleRegister = 0x06,
        WriteMultipleCoils = 0x0F,
        WriteMultipleRegisters = 0x10,
    }
    
    #[derive(Clone, Debug)]
    pub struct ModbusFrame {
        pub slave_id: u8,
        pub function: ModbusFunction,
        pub address: u16,
        pub data: Vec<u16>,
        pub crc: u16,
    }
    
    pub struct ModbusMaster {
        serial: SerialDriver,
        timeout_ms: u32,
        inter_frame_delay_us: Micros,
    }
    
    impl ModbusMaster {
        pub fn new(serial: SerialDriver) -> Self {
            Self {
                serial,
                timeout_ms: 1000,
                inter_frame_delay_us: 3500,  // 3.5 character times
            }
        }
        
        pub fn read_holding_registers(&mut self, slave_id: u8, address: u16, count: u16) -> Result<Vec<u16>, String> {
            // Build Modbus RTU frame
            let mut frame = vec![slave_id, ModbusFunction::ReadHoldingRegisters as u8];
            frame.extend_from_slice(&address.to_be_bytes());
            frame.extend_from_slice(&count.to_be_bytes());
            
            // Calculate CRC
            let crc = self.calculate_crc(&frame);
            frame.extend_from_slice(&crc.to_le_bytes());
            
            // Send frame
            self.serial.write(&frame)?;
            
            // Wait for response
            std::thread::sleep(Duration::from_millis(self.timeout_ms as u64));
            
            // Read response
            let response = self.serial.read(256)?;
            
            // Parse response
            if response.len() < 5 {
                return Err("Invalid response length".to_string());
            }
            
            // Extract register values
            let mut registers = Vec::new();
            for i in (3..response.len()-2).step_by(2) {
                let value = u16::from_be_bytes([response[i], response[i+1]]);
                registers.push(value);
            }
            
            Ok(registers)
        }
        
        fn calculate_crc(&self, data: &[u8]) -> u16 {
            let mut crc: u16 = 0xFFFF;
            
            for byte in data {
                crc ^= *byte as u16;
                for _ in 0..8 {
                    if crc & 0x0001 != 0 {
                        crc >>= 1;
                        crc ^= 0xA001;
                    } else {
                        crc >>= 1;
                    }
                }
            }
            
            crc
        }
    }
}

// ============================================================================
// Ethernet Driver (Real-time Ethernet)
// ============================================================================

#[derive(Clone, Debug)]
pub struct EthernetFrame {
    pub dst_mac: [u8; 6],
    pub src_mac: [u8; 6],
    pub ethertype: u16,
    pub payload: Vec<u8>,
    pub timestamp_us: Micros,
}

#[derive(Clone, Debug)]
pub enum EthernetSpeed {
    Mbps10,
    Mbps100,
    Gbps1,
    Gbps10,
}

pub struct EthernetDriver {
    interface: String,
    mac_address: [u8; 6],
    speed: EthernetSpeed,
    tx_queue: Arc<Mutex<VecDeque<EthernetFrame>>>,
    rx_queue: Arc<Mutex<VecDeque<EthernetFrame>>>,
    max_frame_size: usize,
    max_latency_us: Micros,
    statistics: Arc<Mutex<EthernetStatistics>>,
}

#[derive(Clone, Debug, Default)]
pub struct EthernetStatistics {
    pub tx_packets: u64,
    pub rx_packets: u64,
    pub tx_bytes: u64,
    pub rx_bytes: u64,
    pub tx_errors: u32,
    pub rx_errors: u32,
    pub collisions: u32,
}

impl EthernetDriver {
    pub fn new(interface: &str, mac_address: [u8; 6], speed: EthernetSpeed) -> Self {
        Self {
            interface: interface.to_string(),
            mac_address,
            speed,
            tx_queue: Arc::new(Mutex::new(VecDeque::new())),
            rx_queue: Arc::new(Mutex::new(VecDeque::new())),
            max_frame_size: 1518,  // Standard Ethernet MTU
            max_latency_us: 100,   // 100μs for real-time Ethernet
            statistics: Arc::new(Mutex::new(EthernetStatistics::default())),
        }
    }
    
    pub fn init(&mut self) -> Result<(), String> {
        println!("Initializing Ethernet interface {} with MAC {:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
                 self.interface,
                 self.mac_address[0], self.mac_address[1], self.mac_address[2],
                 self.mac_address[3], self.mac_address[4], self.mac_address[5]);
        Ok(())
    }
    
    pub fn send_frame(&mut self, frame: EthernetFrame) -> Result<(), String> {
        let start = Instant::now();
        
        if frame.payload.len() > self.max_frame_size - 14 {  // 14 = Ethernet header size
            return Err("Frame too large".to_string());
        }
        
        let mut queue = self.tx_queue.lock().map_err(|e| e.to_string())?;
        queue.push_back(frame.clone());
        
        // Update statistics
        let mut stats = self.statistics.lock().map_err(|e| e.to_string())?;
        stats.tx_packets += 1;
        stats.tx_bytes += frame.payload.len() as u64 + 14;
        
        // Check real-time constraint
        let elapsed_us = start.elapsed().as_micros() as u64;
        if elapsed_us > self.max_latency_us {
            return Err(format!("Ethernet send exceeded latency: {} > {} us", elapsed_us, self.max_latency_us));
        }
        
        Ok(())
    }
    
    pub fn receive_frame(&mut self) -> Result<Option<EthernetFrame>, String> {
        let start = Instant::now();
        
        let mut queue = self.rx_queue.lock().map_err(|e| e.to_string())?;
        let frame = queue.pop_front();
        
        if let Some(ref f) = frame {
            // Update statistics
            let mut stats = self.statistics.lock().map_err(|e| e.to_string())?;
            stats.rx_packets += 1;
            stats.rx_bytes += f.payload.len() as u64 + 14;
        }
        
        // Check real-time constraint
        let elapsed_us = start.elapsed().as_micros() as u64;
        if elapsed_us > self.max_latency_us {
            return Err(format!("Ethernet receive exceeded latency: {} > {} us", elapsed_us, self.max_latency_us));
        }
        
        Ok(frame)
    }
    
    pub fn get_statistics(&self) -> Result<EthernetStatistics, String> {
        let stats = self.statistics.lock().map_err(|e| e.to_string())?;
        Ok(stats.clone())
    }
}

// EtherCAT protocol for real-time industrial automation
pub mod ethercat {
    use super::*;
    
    #[derive(Clone, Debug)]
    pub enum EtherCATCommand {
        NOP = 0x00,
        APRD = 0x01,  // Auto-increment Physical Read
        APWR = 0x02,  // Auto-increment Physical Write
        APRW = 0x03,  // Auto-increment Physical Read/Write
        FPRD = 0x04,  // Configured Address Physical Read
        FPWR = 0x05,  // Configured Address Physical Write
        FPRW = 0x06,  // Configured Address Physical Read/Write
        BRD = 0x07,   // Broadcast Read
        BWR = 0x08,   // Broadcast Write
        BRW = 0x09,   // Broadcast Read/Write
        LRD = 0x0A,   // Logical Read
        LWR = 0x0B,   // Logical Write
        LRW = 0x0C,   // Logical Read/Write
        ARMW = 0x0D,  // Auto-increment Physical Read Multiple Write
        FRMW = 0x0E,  // Configured Address Physical Read Multiple Write
    }
    
    #[derive(Clone, Debug)]
    pub struct EtherCATDatagram {
        pub command: EtherCATCommand,
        pub index: u8,
        pub address: u32,
        pub data: Vec<u8>,
        pub working_counter: u16,
    }
    
    pub struct EtherCATMaster {
        ethernet: EthernetDriver,
        slaves: Vec<EtherCATSlave>,
        cycle_time_us: Micros,
        distributed_clock_enabled: bool,
    }
    
    #[derive(Clone, Debug)]
    pub struct EtherCATSlave {
        pub position: u16,
        pub vendor_id: u32,
        pub product_code: u32,
        pub revision: u32,
        pub serial_number: u32,
        pub alias: u16,
        pub state: SlaveState,
    }
    
    #[derive(Clone, Debug)]
    pub enum SlaveState {
        Init = 0x01,
        PreOp = 0x02,
        Bootstrap = 0x03,
        SafeOp = 0x04,
        Op = 0x08,
    }
    
    impl EtherCATMaster {
        pub fn new(ethernet: EthernetDriver, cycle_time_us: Micros) -> Self {
            Self {
                ethernet,
                slaves: Vec::new(),
                cycle_time_us,
                distributed_clock_enabled: false,
            }
        }
        
        pub fn scan_bus(&mut self) -> Result<usize, String> {
            // Scan for slaves on the bus
            // In real implementation, this would send EtherCAT discovery frames
            println!("Scanning EtherCAT bus...");
            Ok(self.slaves.len())
        }
        
        pub fn set_slave_state(&mut self, slave_pos: u16, state: SlaveState) -> Result<(), String> {
            if let Some(slave) = self.slaves.iter_mut().find(|s| s.position == slave_pos) {
                slave.state = state;
                Ok(())
            } else {
                Err(format!("Slave at position {} not found", slave_pos))
            }
        }
        
        pub fn enable_distributed_clock(&mut self) {
            self.distributed_clock_enabled = true;
        }
    }
}

// Driver manager for unified interface
pub struct DriverManager {
    can_drivers: Vec<CANDriver>,
    serial_drivers: Vec<SerialDriver>,
    ethernet_drivers: Vec<EthernetDriver>,
}

impl DriverManager {
    pub fn new() -> Self {
        Self {
            can_drivers: Vec::new(),
            serial_drivers: Vec::new(),
            ethernet_drivers: Vec::new(),
        }
    }
    
    pub fn add_can_driver(&mut self, driver: CANDriver) {
        self.can_drivers.push(driver);
    }
    
    pub fn add_serial_driver(&mut self, driver: SerialDriver) {
        self.serial_drivers.push(driver);
    }
    
    pub fn add_ethernet_driver(&mut self, driver: EthernetDriver) {
        self.ethernet_drivers.push(driver);
    }
    
    pub fn init_all(&mut self) -> Result<(), String> {
        for driver in &mut self.can_drivers {
            driver.init()?;
        }
        for driver in &mut self.serial_drivers {
            driver.init()?;
        }
        for driver in &mut self.ethernet_drivers {
            driver.init()?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_can_driver() {
        let mut can = CANDriver::new("can0", CANBitrate::Mbps1);
        assert!(can.init().is_ok());
        
        let frame = CANFrame {
            id: 0x123,
            data: [1, 2, 3, 4, 5, 6, 7, 8],
            dlc: 8,
            is_extended: false,
            is_rtr: false,
            timestamp_us: 0,
        };
        
        assert!(can.send_frame(frame).is_ok());
    }
    
    #[test]
    fn test_serial_driver() {
        let config = SerialConfig::default();
        let mut serial = SerialDriver::new("/dev/ttyUSB0", config);
        assert!(serial.init().is_ok());
        
        let data = b"Hello, Pulsar!";
        assert_eq!(serial.write(data).unwrap(), data.len());
    }
    
    #[test]
    fn test_ethernet_driver() {
        let mac = [0x00, 0x11, 0x22, 0x33, 0x44, 0x55];
        let mut eth = EthernetDriver::new("eth0", mac, EthernetSpeed::Gbps1);
        assert!(eth.init().is_ok());
        
        let frame = EthernetFrame {
            dst_mac: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
            src_mac: mac,
            ethertype: 0x0800,  // IPv4
            payload: vec![0; 64],
            timestamp_us: 0,
        };
        
        assert!(eth.send_frame(frame).is_ok());
        
        let stats = eth.get_statistics().unwrap();
        assert_eq!(stats.tx_packets, 1);
    }
}