import json
import pandas as pd
import numpy as np
import random
import time
from typing import List, Tuple, Dict

class GA:
    def __init__(self, data):
        self.data = data

    # ===============================
    # Utilitas Data: Load & Matrix
    # ===============================

    def build_locations(df: pd.DataFrame) -> Tuple[List[str], Dict[str, int]]:
        """
        Menghasilkan daftar lokasi terurut dan mapping lokasi->index.
        """
        locations = sorted(list(set(df['Source'].unique()) | set(df['Destination'].unique())))
        location_to_index = {loc: idx for idx, loc in enumerate(locations)}
        return locations, location_to_index

    def build_distance_matrix(df: pd.DataFrame, locations: List[str], location_to_index: Dict[str, int]) -> np.ndarray:
        """
        Membangun matriks jarak NxN dari DataFrame.
        """
        n = len(locations)
        matrix = np.full((n, n), np.inf, dtype=float)
        for _, row in df.iterrows():
            i = location_to_index[row['Source']]
            j = location_to_index[row['Destination']]
            matrix[i, j] = float(row['Distance (m)'])
        return matrix
    
    def parse_path_coordinates(path_data: list) -> List[Tuple[float, float]]:
        """
        Parse nested list path coordinates into list of (lat, lon) tuples.
        Expected format: [[[lon, lat], [lon, lat]], ...]
        Folium expects [lat, lon].
        """
        flat_coords = []
        if isinstance(path_data, list):
            for segment in path_data:
                if isinstance(segment, list):
                    for coord_pair in segment:
                        if isinstance(coord_pair, list) and len(coord_pair) == 2:
                            try:
                                # Convert [lon, lat] to [lat, lon]
                                flat_coords.append([float(coord_pair[1]), float(coord_pair[0])])
                            except ValueError:
                                print(f"Warning: Could not parse coordinate pair {coord_pair} to float.")
                                continue
                        else:
                            print(f"Warning: Unexpected coordinate pair format: {coord_pair}")
                else:
                    print(f"Warning: Unexpected segment format in path data: {segment}")
        return flat_coords

    def get_location_coordinates(df: pd.DataFrame, location_name: str) -> Tuple[float, float] | None:
        """
        Mendapatkan koordinat start/end dari lokasi berdasarkan all_locations_df.
        """
        try:
            location_row = df[df['Name'] == location_name].iloc[0]
            return (float(location_row['Latitude']), float(location_row['Longitude']))
        except (IndexError, ValueError, KeyError):
            print(f"Warning: Could not get coordinates for {location_name} from all_locations_df.")
            return None

    # ==================================
    # Genetic Algorithm for TSP (GA-TSP)
    # ==================================

    class GeneticAlgorithmTSP:
        def __init__(self, df: pd.DataFrame, distance_matrix: np.ndarray, locations: List[str]):
            """
            GA untuk TSP berbasis matriks jarak.
            """
            self.distance_matrix = distance_matrix
            self.locations = locations
            self.df = df # Store the original distance_matrix_df
            self.n_cities = len(locations)
            self.location_to_index = {loc: idx for idx, loc in enumerate(locations)}

        # ---------- Evaluasi ----------
        def calculate_route_distance(self, route: List[int]) -> float:
            """
            Hitung total jarak rute siklik (kembali ke awal).
            """
            total = 0.0
            for i in range(len(route)):
                a = route[i]
                b = route[(i + 1) % len(route)]
                total += self.distance_matrix[a, b]
            return total

        # ---------- Inisialisasi ----------
        def create_individual(self, start_city: int = 0) -> List[int]:
            """
            Individu: permutasi kota, fix kota awal.
            """
            others = [i for i in range(self.n_cities) if i != start_city]
            random.shuffle(others)
            return [start_city] + others

        def create_population(self, size: int, start_city: int = 0) -> List[List[int]]:
            return [self.create_individual(start_city) for _ in range(size)]

        # ---------- Seleksi ----------
        def tournament_selection(self, population: List[List[int]], k: int = 3) -> List[int]:
            """
            Tournament selection.
            """
            sample = random.sample(population, min(k, len(population)))
            return min(sample, key=self.calculate_route_distance)

        # ---------- Crossover (OX) ----------
        def order_crossover(self, p1: List[int], p2: List[int]) -> Tuple[List[int], List[int]]:
            """
            Order Crossover mempertahankan urutan relatif.
            Titik awal rute (kota awal) dipertahankan.
            """
            start_city = p1[0]
            a = p1[1:]
            b = p2[1:]
            n = len(a)
            if n <= 1:
                return p1.copy(), p2.copy()

            i, j = sorted(random.sample(range(n), 2))
            # Anak 1
            c1 = [-1] * n
            c1[i:j] = a[i:j]
            rem = [x for x in b if x not in c1]
            it = iter(rem)
            for idx in range(n):
                if c1[idx] == -1:
                    c1[idx] = next(it)
            # Anak 2
            c2 = [-1] * n
            c2[i:j] = b[i:j]
            rem = [x for x in a if x not in c2]
            it = iter(rem)
            for idx in range(n):
                if c2[idx] == -1:
                    c2[idx] = next(it)
            return [start_city] + c1, [start_city] + c2

        # ---------- Mutasi ----------
        def mutate_swap(self, indiv: List[int], rate: float = 0.02) -> List[int]:
            """
            Swap dua posisi acak (kecuali kota awal).
            """
            if len(indiv) <= 2:
                return indiv
            if random.random() < rate:
                i, j = random.sample(range(1, len(indiv)), 2)
                indiv = indiv.copy()
                indiv[i], indiv[j] = indiv[j], indiv[i]
            return indiv

        # ---------- Jalankan GA ----------
        def run(self,
                population_size: int = 150,
                generations: int = 300,
                crossover_rate: float = 0.85,
                mutation_rate: float = 0.015,
                elitism_count: int = 3,
                start_city: int = 0,
                verbose: bool = True) -> Dict:
            """
            Menjalankan evolusi GA dan mengembalikan hasil terbaik.
            """
            pop = self.create_population(population_size, start_city)
            best_hist = []
            avg_hist = []
            t0 = time.time()

            for g in range(generations):
                fitness = [(ind, self.calculate_route_distance(ind)) for ind in pop]
                fitness.sort(key=lambda x: x[1])
                dists = [f[1] for f in fitness]
                best_hist.append(dists[0])
                avg_hist.append(sum(dists) / len(dists))

                if verbose and (g % 100 == 0 or g == generations - 1):
                    base = best_hist[0]
                    improve = 0.0 if base == 0 else (base - dists[0]) / base * 100.0
                    print(f"Gen {g:3d}: Best={dists[0]:8.2f}m | Avg={avg_hist[-1]:8.2f}m | Improve={improve:5.1f}%")

                # Elitisme
                new_pop = [fitness[i][0].copy() for i in range(min(elitism_count, len(fitness)))]

                # Reproduksi
                while len(new_pop) < population_size:
                    p1 = self.tournament_selection(pop, k=3)
                    p2 = self.tournament_selection(pop, k=3)
                    if random.random() < crossover_rate:
                        c1, c2 = self.order_crossover(p1, p2)
                    else:
                        c1, c2 = p1.copy(), p2.copy()
                    c1 = self.mutate_swap(c1, mutation_rate)
                    c2 = self.mutate_swap(c2, mutation_rate)
                    new_pop.extend([c1, c2])

                pop = new_pop[:population_size]

            fitness = [(ind, self.calculate_route_distance(ind)) for ind in pop]
            fitness.sort(key=lambda x: x[1])
            best_route, best_dist = fitness[0]
            elapsed = time.time() - t0

            return {
                "best_route": best_route,
                "best_distance": float(best_dist),
                "best_distances_history": best_hist,
                "avg_distances_history": avg_hist,
                "execution_time": elapsed,
                "generations": generations,
                "start_city": start_city,
                "improvement_percentage": 0.0 if best_hist[0] == 0 else (best_hist[0] - best_dist) / best_hist[0] * 100.0
            }

        # ---------- Cetak Rute ----------
        def print_route_details(self, route: List[int]) -> None:
            """
            Cetak tabel rute dan total jarak.
            """
            print("\n" + "="*90)
            print("OPTIMAL ROUTE DETAILS")
            print("="*90)
            print(f"{'No.':<4} {'From':<35} {'To':<35} {'Distance (m)':>14}")
            print("-"*90)
            total = 0.0
            for i in range(len(route)):
                a = route[i]
                b = route[(i + 1) % len(route)]
                d = self.distance_matrix[a, b]
                total += d
                print(f"{i+1:<4} {self.locations[a]:<35} {self.locations[b]:<35} {d:14.2f}")
            print("-"*90)
            print(f"{'TOTAL DISTANCE:':<74} {total:14.2f}")
            print(f"{'TOTAL DISTANCE (km):':<74} {total/1000:14.2f}")

        
    # ===============================
    # Main Script
    # ===============================

    def main(self):
        # 1) Load JSON -> DataFrame
        # json_path = "distance_matrix.json"  # Ubah path jika perlu
        df = self.data
        
        # 2) Siapkan lokasi dan matriks jarak
        locations, loc2idx = GA.build_locations(df)
        dist_matrix = GA.build_distance_matrix(df, locations, loc2idx)

        # 3) Inisialisasi GA
        ga = GA.GeneticAlgorithmTSP(df,dist_matrix, locations)

        # Opsional: set seed untuk reproducibility
        random.seed(42)
        np.random.seed(42)

        # Tentukan start city (contoh: mulai dari 'Kost Exclusive Wisma Raya' jika ada)
        start_city_name = df.iloc[0]['Source']
        start_city = locations.index(start_city_name) if start_city_name in locations else 0

        # 4) Jalankan GA
        results = ga.run(
            population_size=150,
            generations=300,
            crossover_rate=0.85,
            mutation_rate=0.015,
            elitism_count=3,
            start_city=start_city,
            verbose=True
        )

        # 5) Tampilkan hasil
        ga.print_route_details(results["best_route"])

        print("\nSUMMARY")
        print("-"*40)
        print(f"Starting Point         : {locations[results['start_city']]}")
        print(f"Number of Locations    : {len(locations)}")
        print(f"Optimal Distance (m)   : {results['best_distance']:.2f}")
        print(f"Optimal Distance (km)  : {results['best_distance']/1000:.2f}")
        print(f"Execution Time (s)     : {results['execution_time']:.2f}")
        print(f"Total Improvement (%)  : {results['improvement_percentage']:.1f}")

        print("\nROUTE SEQUENCE")
        print("-"*40)
        for i, idx in enumerate(results["best_route"], 1):
            print(f"{i:2d}. {locations[idx]}")
        print(f"{len(results['best_route'])+1:2d}. {locations[results['best_route'][0]]} (Return to start)")

        # get path from df (self.data)
        path_lines = []
        for i in range(len(results['best_route'])):
            src_idx = results['best_route'][i]
            dest_idx = results['best_route'][(i + 1) % len(results['best_route'])]
            src_name = locations[src_idx]
            dest_name = locations[dest_idx]
            src_coords = self.data.loc[self.data['Source'] == src_name, 'SourceCoordinates'].values[0] if len(self.data[self.data['Source'] == src_name]) > 0 else None
            dest_coords = self.data.loc[self.data['Destination'] == dest_name, 'DestinationCoordinates'].values[0] if len(self.data[self.data['Destination'] == dest_name]) > 0 else None
            path_data = self.data[
                (self.data['Source'] == src_name) & (self.data['Destination'] == dest_name)
            ]['Path'].values
            if len(path_data) > 0:
                parsed_path = GA.parse_path_coordinates(path_data[0])
                detailed_path = {
                    'source_name': src_name,
                    'source_coords': src_coords,
                    'destination_coords': dest_coords,
                    'destination_name': dest_name,
                    'path_coordinates': parsed_path
                }
                path_lines.append(detailed_path)
            else:
                path_lines.append([])  # Jika tidak ada data jalur

        results["path_lines"] = path_lines
        return results

    if __name__ == "__main__":
        main()
