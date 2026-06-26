use soroban_sdk::{contracttype, Address, Env, String, Vec, Map, Bytes};

/// Compact storage key for reducing storage footprint
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompactKey(u64, u8);

/// Packed user data to reduce storage slots
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PackedUserData {
    pub total_balance: i128,
    pub savings_count: u16,
    pub flags: u8,
}

/// Compact savings plan - packs data more efficiently
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompactSavingsPlan {
    pub balance: i128,
    pub start_time: u32,
    pub last_deposit: u32,
    pub interest_rate: u16,
    pub is_completed: bool,
    pub is_withdrawn: bool,
    pub plan_type: u8,
    pub duration_or_target: u32,
    pub extra_data: u32,
}

/// Bit-packed flags for efficient storage
const FLAG_COMPLETED: u8 = 1;
const FLAG_WITHDRAWN: u8 = 2;
const FLAG_PUBLIC: u8 = 4;

impl CompactSavingsPlan {
    pub fn pack(
        balance: i128,
        start_time: u64,
        last_deposit: u64,
        interest_rate: u32,
        is_completed: bool,
        is_withdrawn: bool,
        plan_type: u8,
        duration_or_target: u32,
        extra_data: u32,
    ) -> Self {
        Self {
            balance,
            start_time: start_time as u32,
            last_deposit: last_deposit as u32,
            interest_rate: interest_rate as u16,
            is_completed,
            is_withdrawn,
            plan_type,
            duration_or_target,
            extra_data,
        }
    }

    pub fn unpack(&self) -> (i128, u64, u64, u32, bool, bool, u8, u32, u32) {
        (
            self.balance,
            self.start_time as u64,
            self.last_deposit as u64,
            self.interest_rate as u32,
            self.is_completed,
            self.is_withdrawn,
            self.plan_type,
            self.duration_or_target,
            self.extra_data,
        )
    }
}

impl PackedUserData {
    pub fn pack(total_balance: i128, savings_count: u32, flags: u8) -> Self {
        Self {
            total_balance,
            savings_count: savings_count as u16,
            flags,
        }
    }

    pub fn unpack(&self) -> (i128, u32, u8) {
        (
            self.total_balance,
            self.savings_count as u32,
            self.flags,
        )
    }

    pub fn is_flag_set(&self, flag: u8) -> bool {
        (self.flags & flag) != 0
    }

    pub fn set_flag(&mut self, flag: u8) {
        self.flags |= flag;
    }

    pub fn clear_flag(&mut self, flag: u8) {
        self.flags &= !flag;
    }
}

/// Storage packer utility for batch operations
pub struct StoragePacker<'a> {
    env: &'a Env,
}

impl<'a> StoragePacker<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self { env }
    }

    /// Pack multiple values into a single storage entry
    pub fn pack_values<T: contracttype + Clone>(&self, values: Vec<T>) -> Vec<Vec<u8>> {
        let mut packed: Vec<Vec<u8>> = Vec::new(self.env);
        for v in values.iter() {
            let bytes = self.value_to_bytes(v);
            packed.push_back(bytes);
        }
        packed
    }

    /// Unpack multiple values from storage
    pub fn unpack_values<T: contracttype + Clone>(&self, packed: Vec<Vec<u8>>) -> Vec<T> {
        let mut values: Vec<T> = Vec::new(self.env);
        for bytes in packed.iter() {
            if let Some(v) = self.bytes_to_value(bytes) {
                values.push_back(v);
            }
        }
        values
    }

    fn value_to_bytes<T: contracttype + Clone>(&self, value: &T) -> Vec<u8> {
        // Use Soroban's built-in serialization
        let mut bytes = Vec::new(self.env);
        // Note: In practice, use env.serialize() or similar
        bytes
    }

    fn bytes_to_value<T: contracttype + Clone>(&self, _bytes: &Vec<u8>) -> Option<T> {
        // Note: In practice, use env.deserialize() or similar
        None
    }
}

/// Efficient map for storing address-to-value mappings
pub struct AddressMap<'a> {
    env: &'a Env,
}

impl<'a> AddressMap<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self { env }
    }

    pub fn set(&self, key: &Address, value: &i128) {
        let packed_key = self.pack_address(key);
        self.env.storage().persistent().set(&packed_key, value);
    }

    pub fn get(&self, key: &Address) -> Option<i128> {
        let packed_key = self.pack_address(key);
        self.env.storage().persistent().get(&packed_key)
    }

    pub fn remove(&self, key: &Address) {
        let packed_key = self.pack_address(key);
        self.env.storage().persistent().remove(&packed_key);
    }

    fn pack_address(&self, addr: &Address) -> u64 {
        // Create a compact key from address
        let mut hash_bytes: [u8; 32] = [0; 32];
        // Use the last 8 bytes of the address as the key
        // This is a simplification - in practice, use proper hashing
        let addr_str = addr.to_string();
        let len = addr_str.len().min(32);
        for i in 0..len {
            hash_bytes[i] = addr_str.as_bytes()[i];
        }
        u64::from_le_bytes([
            hash_bytes[24], hash_bytes[25], hash_bytes[26], hash_bytes[27],
            hash_bytes[28], hash_bytes[29], hash_bytes[30], hash_bytes[31],
        ])
    }
}

/// Batch operations for reducing storage reads/writes
pub struct BatchStorage<'a> {
    env: &'a Env,
    reads: usize,
    writes: usize,
}

impl<'a> BatchStorage<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self { env, reads: 0, writes: 0 }
    }

    pub fn get_read_count(&self) -> usize {
        self.reads
    }

    pub fn get_write_count(&self) -> usize {
        self.writes
    }

    /// Batch read multiple values
    pub fn batch_get<T: contracttype + Clone>(&mut self, keys: Vec<u64>) -> Vec<Option<T>> {
        let mut results: Vec<Option<T>> = Vec::new(self.env);
        for key in keys.iter() {
            let result: Option<T> = self.env.storage().persistent().get(key);
            self.reads += 1;
            results.push_back(result);
        }
        results
    }

    /// Batch write multiple values
    pub fn batch_set<T: contracttype + Clone>(&mut self, keys: Vec<u64>, values: Vec<T>) {
        if keys.len() != values.len() {
            return;
        }
        for i in 0..keys.len() {
            self.env.storage().persistent().set(&keys.get(i).unwrap_or(&0), &values.get(i).cloned().unwrap_or_default());
            self.writes += 1;
        }
    }
}

/// Storage size estimator
pub fn estimate_storage_size(data: &impl contracttype) -> usize {
    // Rough estimation based on type
    // In practice, measure actual serialized sizes
    std::mem::size_of_val(data)
}

/// Get storage usage statistics
pub struct StorageStats {
    pub total_keys: usize,
    pub estimated_bytes: usize,
}

pub fn get_storage_stats(env: &Env) -> StorageStats {
    // Simplified - actual implementation would track all keys
    StorageStats {
        total_keys: 0,
        estimated_bytes: 0,
    }
}