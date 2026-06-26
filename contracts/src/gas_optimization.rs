use soroban_sdk::{Env, Vec, Map, Address};

/// Gas optimization utilities for Soroban contracts
/// These patterns help reduce gas consumption in contract operations

/// Cached calculation result to avoid redundant computations
pub struct GasCache<T> {
    value: Option<T>,
    computed_at: u64,
}

/// Efficient loop pattern - unroll small loops
/// Instead of looping, directly compute for small fixed iterations
#[inline]
pub fn sum_three(a: i128, b: i128, c: i128) -> i128 {
    a + b + c
}

#[inline]
pub fn sum_four(a: i128, b: i128, c: i128, d: i128) -> i128 {
    a + b + c + d
}

/// Use const for immutable values to avoid runtime lookups
pub const DEFAULT_THRESHOLD: u32 = 2;
pub const MAX_ITERATIONS: u32 = 100;
pub const GAS_BUFFER: u64 = 1000;

/// Optimize comparisons - use early returns
#[inline]
pub fn safe_divide(dividend: i128, divisor: i128) -> i128 {
    if divisor == 0 {
        return 0;
    }
    dividend / divisor
}

#[inline]
pub fn safe_subtract(a: i128, b: i128) -> i128 {
    if a > b {
        a - b
    } else {
        0
    }
}

/// Batch operations to reduce per-operation overhead
pub struct BatchProcessor<'a> {
    env: &'a Env,
    batch_size: usize,
    processed: usize,
}

impl<'a> BatchProcessor<'a> {
    pub fn new(env: &'a Env, batch_size: usize) -> Self {
        Self { env, batch_size, processed: 0 }
    }

    pub fn process_batch<F, T>(&mut self, items: Vec<T>, mut processor: F) -> usize
    where
        F: FnMut(&T) -> bool,
    {
        let mut processed = 0;
        for item in items.iter() {
            if processor(&item) {
                processed += 1;
            }
        }
        self.processed += processed;
        processed
    }

    pub fn get_processed_count(&self) -> usize {
        self.processed
    }
}

/// Lazy evaluation - defer expensive computations
pub struct LazyValue<T> {
    computed: bool,
    value: Option<T>,
}

impl<T> LazyValue<T> {
    pub fn new() -> Self {
        Self { computed: false, value: None }
    }

    pub fn get<F: FnOnce() -> T>(&mut self, compute: F) -> &T {
        if !self.computed {
            self.value = Some(compute());
            self.computed = true;
        }
        self.value.as_ref().unwrap()
    }

    pub fn invalidate(&mut self) {
        self.computed = false;
        self.value = None;
    }
}

/// Memoization for repeated calculations
pub struct MemoMap<'a> {
    env: &'a Env,
    cache: Map<u64, i128>,
    hits: usize,
    misses: usize,
}

impl<'a> MemoMap<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self { env, cache: Map::new(env), hits: 0, misses: 0 }
    }

    pub fn get_or_compute<F: FnOnce() -> i128>(&mut self, key: u64, compute: F) -> i128 {
        if let Some(value) = self.cache.get(key) {
            self.hits += 1;
            return value;
        }
        self.misses += 1;
        let value = compute();
        self.cache.set(key, value);
        value
    }

    pub fn get_stats(&self) -> (usize, usize, f64) {
        let total = self.hits + self.misses;
        let hit_rate = if total > 0 {
            (self.hits as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        (self.hits, self.misses, hit_rate)
    }

    pub fn clear(&mut self) {
        self.cache = Map::new(self.env);
        self.hits = 0;
        self.misses = 0;
    }
}

/// Storage read optimization - cache frequently accessed values
pub struct StorageCache<'a> {
    env: &'a Env,
    reads: Map<u64, i128>,
}

impl<'a> StorageCache<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self { env, reads: Map::new(env) }
    }

    pub fn get_cached(&mut self, key: u64, fallback: i128) -> i128 {
        if let Some(value) = self.reads.get(key) {
            return value;
        }
        fallback
    }

    pub fn set_cached(&mut self, key: u64, value: i128) {
        self.reads.set(key, value);
    }
}

/// Optimize loops - use iterators efficiently
pub fn find_in_vec(env: &Env, target: &Address, items: &Vec<Address>) -> bool {
    for item in items.iter() {
        if item == *target {
            return true;
        }
    }
    false
}

/// Use binary search for sorted data (if available)
pub fn binary_search(env: &Env, target: i128, sorted: &Vec<i128>) -> Option<u32> {
    let len = sorted.len() as u32;
    if len == 0 {
        return None;
    }

    let mut left: u32 = 0;
    let mut right = len;

    while left < right {
        let mid = left + (right - left) / 2;
        if let Some(val) = sorted.get(mid) {
            if val == target {
                return Some(mid);
            } else if val < target {
                left = mid + 1;
            } else {
                right = mid;
            }
        } else {
            break;
        }
    }
    None
}

/// Min/max helpers to avoid branching
#[inline]
pub fn min_i128(a: i128, b: i128) -> i128 {
    if a < b { a } else { b }
}

#[inline]
pub fn max_i128(a: i128, b: i128) -> i128 {
    if a > b { a } else { b }
}

#[inline]
pub fn clamp_i128(value: i128, min: i128, max: i128) -> i128 {
    if value < min { min } else if value > max { max } else { value }
}

/// Optimize array operations - pre-allocate when size is known
pub fn sum_array(values: &[i128]) -> i128 {
    let mut sum = 0i128;
    for v in values {
        sum += v;
    }
    sum
}

/// Use const functions for compile-time computations
pub const fn pow_10(n: u32) -> u128 {
    let mut result = 1u128;
    let mut i = 0;
    while i < n {
        result *= 10;
        i += 1;
    }
    result
}

/// Gas estimation helpers
pub struct GasEstimator {
    pub storage_reads: u64,
    pub storage_writes: u64,
    pub computations: u64,
}

impl GasEstimator {
    pub fn new() -> Self {
        Self { storage_reads: 0, storage_writes: 0, computations: 0 }
    }

    pub fn estimate(&self) -> u64 {
        // Soroban gas model approximation
        const READ_COST: u64 = 1;
        const WRITE_COST: u64 = 5;
        const COMPUTE_COST: u64 = 1;
        
        self.storage_reads * READ_COST + 
        self.storage_writes * WRITE_COST + 
        self.computations * COMPUTE_COST
    }

    pub fn add_read(&mut self) {
        self.storage_reads += 1;
    }

    pub fn add_write(&mut self) {
        self.storage_writes += 1;
    }

    pub fn add_compute(&mut self, units: u64) {
        self.computations += units;
    }
}

/// Constant-time comparisons to prevent timing attacks (also saves gas in some cases)
pub fn constant_time_eq(a: &Vec<u8>, b: &Vec<u8>) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = true;
    for i in 0..a.len() {
        if a.get(i) != b.get(i) {
            result = false;
        }
    }
    result
}