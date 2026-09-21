import { supabaseClient } from '../config/supabase.js';

export let allData = [];
export let filteredData = [];
export let headers = [];
export let currentIndex = 0;
export const batchSize = 50;

export function setAllData(val) { allData = val; }
export function setFilteredData(val) { filteredData = val; }
export function setHeaders(val) { headers = val; }
export function setCurrentIndex(val) { currentIndex = val; }
