import json
import pandas as pd
import numpy as np
import random
import time
import folium
from typing import List, Tuple, Dict, Optional
from datetime import datetime, timedelta, time as dt_time
import warnings
warnings.filterwarnings('ignore')
from tourism.optimization.time_constraint import NDayTimeScheduler
from tourism.optimization.genetic_algorithm import GA 

# ===============================
# N-Day Multi-Hotel Optimizer
# ===============================

class GA_MultiOptimizer:
    def __init__(self, data, all_location):
        self.data = data
        self.locations_df_df = all_location
        
        # print(self.data)
        # locations, loc2idx = GA.build_locations(self.data)
        # dist_matrix = GA.build_distance_matrix(self.data, locations, loc2idx)

        # # Process locations
        # self.locations_df_df = pd.DataFrame(locations)
        # print(self.locations_df_df.head(2))
        # self.locations_df_df = None
        #     self.distance_matrix_df = None
        # Load distance matrix
        self.distance_df = pd.DataFrame(self.data)

        
        """
        N-day optimizer supporting 3+ days with multiple hotels.
        """
        print("🏨 Initializing N-Day Multi-Hotel Route Optimizer...")

        # Initialize scheduler
        self.scheduler = NDayTimeScheduler()
        
        self._parse_dates()
        self._update_coordinates_from_paths()
        
        # Classify and organize locations
        self.hotels = self._get_hotels()
        self.attractions = self._get_attractions()
        self.n_days = len(self.hotels)
        
        # Build distance matrix
        self._build_distance_matrix()
        
        print(f"✅ Initialized N-Day Optimizer:")
        print(f"   📅 Total days: {self.n_days}")
        print(f"   🏨 Hotels: {len(self.hotels)}")
        print(f"   🎯 Attractions: {len(self.attractions)}")
        
        # Display hotel schedule
        for i, hotel in enumerate(self.hotels):
            checkin_str = hotel['checkin'].strftime('%Y-%m-%d') if hotel['checkin'] else 'N/A'
            checkout_str = hotel['checkout'].strftime('%Y-%m-%d') if hotel['checkout'] else 'N/A'
            print(f"   Day {i+1}: {hotel['name']} ({checkin_str} to {checkout_str})")

    def _parse_dates(self):
        """Parse check-in and check-out dates."""
        for idx, row in self.locations_df_df.iterrows():
            if pd.notna(row['checkIn']):
                self.locations_df_df.at[idx, 'checkIn_date'] = pd.to_datetime(row['checkIn'])
            if pd.notna(row['checkOut']):
                self.locations_df_df.at[idx, 'checkOut_date'] = pd.to_datetime(row['checkOut'])

    def _update_coordinates_from_paths(self):
        """Update coordinates from path data."""
        print("🗺️ Updating coordinates from path data...")
        
        for idx, row in self.locations_df_df.iterrows():
            location_name = row['Name']
            new_coords = self._get_location_coordinates_from_paths(location_name)
            
            self.locations_df_df.at[idx, 'Latitude'] = new_coords[0]
            self.locations_df_df.at[idx, 'Longitude'] = new_coords[1]

    def _get_location_coordinates_from_paths(self, location_name: str) -> Tuple[float, float]:
        """Extract coordinates from path data."""
        try:
            # Try as source
            source_rows = self.distance_df[self.distance_df['Source'] == location_name]
            if len(source_rows) > 0:
                path_coords = self._parse_path_coordinates(source_rows.iloc[0]['Path'])
                if path_coords:
                    return path_coords[0]
            
            # Try as destination
            dest_rows = self.distance_df[self.distance_df['Destination'] == location_name]
            if len(dest_rows) > 0:
                path_coords = self._parse_path_coordinates(dest_rows.iloc[0]['Path'])
                if path_coords:
                    return path_coords[-1]
                    
        except Exception as e:
            print(f"Warning: Could not extract coordinates for {location_name}: {e}")
        
        return (-7.0051, 110.4381)

    def _parse_path_coordinates(self, path_string: str) -> List[Tuple[float, float]]:
        """Parse path coordinates string."""
        if pd.isna(path_string) or not path_string:
            return []
        
        try:
            coords = path_string.split(',')
            coordinates = []
            for i in range(0, len(coords), 2):
                if i + 1 < len(coords):
                    lon = float(coords[i].strip())
                    lat = float(coords[i + 1].strip())
                    coordinates.append((lat, lon))
            return coordinates
        except (ValueError, AttributeError):
            return []

    def _parse_coordinate_string(self, coord_string) -> Tuple[float, float]:
        """Parse coordinate string into lat, lon tuple."""
        if pd.isna(coord_string):
            return None
            
        try:
            if isinstance(coord_string, str):
                # Handle different coordinate string formats
                if coord_string.startswith('(') and coord_string.endswith(')'):
                    # Format: "(lat, lon)"
                    coord_string = coord_string.strip('()')
                
                if ',' in coord_string:
                    parts = coord_string.split(',')
                    if len(parts) == 2:
                        lat = float(parts[0].strip())
                        lon = float(parts[1].strip())
                        return (lat, lon)
                        
            elif isinstance(coord_string, (list, tuple)) and len(coord_string) == 2:
                return (float(coord_string[0]), float(coord_string[1]))
                
        except (ValueError, AttributeError, IndexError):
            pass
            
        return None

    def _get_hotels(self) -> List[Dict]:
        """Get hotels sorted by check-in date."""
        hotels = []
        hotel_rows = self.locations_df_df[self.locations_df_df['Type'] == 'Hotel']
        
        for idx, row in hotel_rows.iterrows():
            hotels.append({
                'name': row['Name'],
                'latitude': row['Latitude'],
                'longitude': row['Longitude'],
                'checkin': row.get('checkIn_date', None),
                'checkout': row.get('checkOut_date', None),
                'original_index': idx,
                'breakfast_available': True
            })
        
        # Sort by check-in date
        hotels.sort(key=lambda x: x['checkin'] if x['checkin'] else datetime.min)
        
        # Assign day indices
        for i, hotel in enumerate(hotels):
            hotel['day_index'] = i
            hotel['index'] = i
            
        return hotels

    def _get_attractions(self) -> List[Dict]:
        """Get attractions with operating hours."""
        attractions = []
        attraction_rows = self.locations_df_df[self.locations_df_df['Type'] == 'Attraction']
        
        for idx, row in attraction_rows.iterrows():
            attractions.append({
                'name': row['Name'],
                'latitude': row['Latitude'],
                'longitude': row['Longitude'],
                'original_index': idx,
                'index': len(self.hotels) + len(attractions),
                'opening_time': self.scheduler.attraction_start,
                'closing_time': self.scheduler.attraction_end,
                'visit_duration': self.scheduler.attraction_visit_duration
            })
        
        return attractions

    def _build_distance_matrix(self):
        """Build distance matrix from JSON data."""
        print("🔨 Building distance matrix...")
        
        self.all_locations = self.hotels + self.attractions
        self.location_names = [loc['name'] for loc in self.all_locations]
        self.name_to_index = {loc['name']: i for i, loc in enumerate(self.all_locations)}
        
        n = len(self.all_locations)
        self.distance_matrix = np.full((n, n), np.inf)
        
        # Fill from JSON data
        filled_pairs = 0
        for _, row in self.distance_df.iterrows():
            source_name = row['Source']
            dest_name = row['Destination']
            distance = float(row['Distance (m)'])
            
            if source_name in self.name_to_index and dest_name in self.name_to_index:
                i = self.name_to_index[source_name]
                j = self.name_to_index[dest_name]
                self.distance_matrix[i][j] = distance
                filled_pairs += 1
        
        print(f"✅ Filled {filled_pairs} distance pairs")
        
        # Fill missing distances
        self._fill_missing_distances()

    def _fill_missing_distances(self):
        """Fill missing distances with approximations."""
        filled_missing = 0
        
        for i in range(len(self.all_locations)):
            for j in range(len(self.all_locations)):
                if i != j and self.distance_matrix[i][j] == np.inf:
                    loc1 = self.all_locations[i]
                    loc2 = self.all_locations[j]
                    
                    # Euclidean distance approximation
                    lat_diff = (loc2['latitude'] - loc1['latitude']) * 111000
                    lon_diff = (loc2['longitude'] - loc1['longitude']) * 111000 * \
                              np.cos(np.radians((loc1['latitude'] + loc2['latitude']) / 2))
                    
                    euclidean_dist = np.sqrt(lat_diff**2 + lon_diff**2)
                    self.distance_matrix[i][j] = euclidean_dist
                    filled_missing += 1
        
        if filled_missing > 0:
            print(f"🔧 Filled {filled_missing} missing distances")

    def optimize_n_day_routes(self, 
                            population_size: int = 150,
                            generations: int = 300,
                            crossover_rate: float = 0.85,
                            mutation_rate: float = 0.02,
                            timing_weight: float = 0.3,
                            verbose: bool = True) -> Dict:
        """
        Optimize N-day routes with timing constraints.
        """
        if len(self.hotels) < 2:
            raise ValueError("Need at least 2 hotels for multi-day optimization")
        
        hotel_indices = list(range(len(self.hotels)))
        attraction_indices = list(range(len(self.hotels), len(self.all_locations)))
        
        print(f"\n📅 N-DAY ROUTE OPTIMIZATION")
        print(f"Days: {self.n_days}")
        print(f"Hotels: {[hotel['name'] for hotel in self.hotels]}")
        print(f"Attractions to distribute: {len(attraction_indices)}")
        print(f"Timing constraint weight: {timing_weight}")
        
        return self._run_n_day_genetic_algorithm(
            hotel_indices, attraction_indices,
            population_size, generations, crossover_rate,
            mutation_rate, timing_weight, verbose
        )

    def _run_n_day_genetic_algorithm(self, hotel_indices: List[int], attraction_indices: List[int],
                                   population_size: int, generations: int,
                                   crossover_rate: float, mutation_rate: float,
                                   timing_weight: float, verbose: bool) -> Dict:
        """Run GA for N-day optimization."""
        
        # Initialize population
        population = self._create_n_day_initial_population(attraction_indices, population_size)
        
        best_fitness_history = []
        avg_fitness_history = []
        feasible_solutions = 0
        start_time = time.time()
        
        print(f"\n🚀 Starting N-Day GA Optimization...")
        print(f"Parameters: Pop={population_size}, Gen={generations}")
        print("-" * 80)
        
        for generation in range(generations):
            # Evaluate fitness for N days
            fitness_scores = []
            generation_feasible = 0
            
            for individual in population:
                fitness, is_feasible = self._evaluate_n_day_fitness(
                    individual, hotel_indices, timing_weight
                )
                fitness_scores.append((individual, fitness, is_feasible))
                if is_feasible:
                    generation_feasible += 1
            
            # Sort by fitness
            fitness_scores.sort(key=lambda x: x[1])
            
            # Track statistics
            fitnesses = [score[1] for score in fitness_scores]
            best_fitness_history.append(fitnesses[0])
            avg_fitness_history.append(sum(fitnesses) / len(fitnesses))
            feasible_solutions = generation_feasible
            
            # Progress report
            if verbose and (generation % 50 == 0 or generation == generations - 1):
                improvement = 0 if len(best_fitness_history) <= 1 else \
                    (best_fitness_history[0] - fitnesses[0]) / best_fitness_history[0] * 100
                feasible_pct = (feasible_solutions / population_size) * 100
                
                print(f"Gen {generation:3d}: Best={fitnesses[0]:8.2f} | "
                      f"Avg={avg_fitness_history[-1]:8.2f} | "
                      f"Feasible={feasible_pct:5.1f}% | Improve={improvement:5.1f}%")
            
            # Create new population
            new_population = []
            
            # Elitism
            elite_count = max(1, population_size // 5)
            feasible_elites = [(ind, fit, feas) for ind, fit, feas in fitness_scores if feas]
            
            if feasible_elites:
                for i in range(min(elite_count, len(feasible_elites))):
                    new_population.append(feasible_elites[i][0].copy())
            
            # Fill remaining elite slots
            remaining_elite = elite_count - len(new_population)
            for i in range(remaining_elite):
                if i < len(fitness_scores):
                    new_population.append(fitness_scores[i][0].copy())
            
            # Generate offspring
            while len(new_population) < population_size:
                parent1 = self._n_day_selection(fitness_scores)
                parent2 = self._n_day_selection(fitness_scores)
                
                if random.random() < crossover_rate:
                    child1, child2 = self._n_day_crossover(parent1, parent2)
                else:
                    child1, child2 = parent1.copy(), parent2.copy()
                
                child1 = self._n_day_mutate(child1, mutation_rate, hotel_indices)
                child2 = self._n_day_mutate(child2, mutation_rate, hotel_indices)
                
                new_population.extend([child1, child2])
            
            population = new_population[:population_size]
        
        # Get best solution
        best_individual = fitness_scores[0][0]
        best_fitness = fitness_scores[0][1]
        best_is_feasible = fitness_scores[0][2]
        execution_time = time.time() - start_time
        
        # Decode N-day results
        daily_routes = self._decode_n_day_individual(best_individual, hotel_indices)
        daily_schedules = {}
        daily_distances = {}
        total_distance = 0
        
        for day in range(self.n_days):
            day_key = f'day{day+1}'
            route = daily_routes[day_key]
            schedule = self.scheduler.calculate_route_schedule(route, self.distance_matrix, self.all_locations)
            distance = self._calculate_route_distance(route)
            
            daily_schedules[f'{day_key}_schedule'] = schedule
            daily_routes[f'{day_key}_route'] = route
            daily_distances[f'{day_key}_distance'] = distance
            total_distance += distance
        
        results = {
            'best_fitness': best_fitness,
            'best_is_feasible': best_is_feasible,
            'n_days': self.n_days,
            'total_distance': total_distance,
            'execution_time': execution_time,
            'feasible_solutions_pct': (feasible_solutions / population_size) * 100,
            'best_fitness_history': best_fitness_history,
            'avg_fitness_history': avg_fitness_history,
            'improvement_percentage': (best_fitness_history[0] - best_fitness) / best_fitness_history[0] * 100 if best_fitness_history else 0
        }
        
        # Add daily results
        results.update(daily_schedules)
        results.update(daily_routes)
        results.update(daily_distances)
        
        return results

    def _create_n_day_initial_population(self, attraction_indices: List[int], 
                                       population_size: int) -> List[Dict]:
        """Create initial population for N days."""
        population = []
        
        for _ in range(population_size):
            attractions = attraction_indices.copy()
            random.shuffle(attractions)
            
            # Distribute attractions across N days
            individual = {}
            attractions_per_day = len(attractions) // self.n_days
            remainder = len(attractions) % self.n_days
            
            start_idx = 0
            for day in range(self.n_days):
                day_key = f'day{day+1}_attractions'
                
                # Calculate attractions for this day
                attractions_today = attractions_per_day
                if day < remainder:  # Distribute remainder
                    attractions_today += 1
                
                end_idx = start_idx + attractions_today
                individual[day_key] = attractions[start_idx:end_idx]
                start_idx = end_idx
            
            population.append(individual)
        
        return population

    def _evaluate_n_day_fitness(self, individual: Dict, hotel_indices: List[int],
                               timing_weight: float) -> Tuple[float, bool]:
        """Evaluate fitness for N-day individual."""
        daily_routes = self._decode_n_day_individual(individual, hotel_indices)
        
        total_distance = 0
        total_timing_penalty = 0
        all_feasible = True
        
        # Evaluate each day
        for day in range(self.n_days):
            day_key = f'day{day+1}'
            route = daily_routes[day_key]
            
            # Calculate distance
            day_distance = self._calculate_route_distance(route)
            total_distance += day_distance
            
            # Calculate timing feasibility
            schedule = self.scheduler.calculate_route_schedule(route, self.distance_matrix, self.all_locations)
            
            if not schedule['feasible']:
                all_feasible = False
                total_timing_penalty += len(schedule['constraint_violations']) * 7200
        
        # Combined fitness
        fitness = total_distance * (1 - timing_weight) + total_timing_penalty * timing_weight
        
        return fitness, all_feasible

    def _decode_n_day_individual(self, individual: Dict, hotel_indices: List[int]) -> Dict:
        """Convert individual to N daily routes."""
        daily_routes = {}
        
        for day in range(self.n_days):
            day_key = f'day{day+1}'
            attractions_key = f'{day_key}_attractions'
            hotel_idx = hotel_indices[day]
            
            # Create route: hotel -> attractions -> hotel
            route = [hotel_idx] + individual[attractions_key] + [hotel_idx]
            daily_routes[day_key] = route
        
        return daily_routes

    def _calculate_route_distance(self, route: List[int]) -> float:
        """Calculate total distance for a route."""
        total_distance = 0.0
        for i in range(len(route) - 1):
            from_idx = route[i]
            to_idx = route[i + 1]
            total_distance += self.distance_matrix[from_idx][to_idx]
        return total_distance

    def _n_day_selection(self, fitness_scores: List, tournament_size: int = 3) -> Dict:
        """Tournament selection for N-day optimization."""
        feasible_solutions = [score for score in fitness_scores if score[2]]
        
        if feasible_solutions and random.random() < 0.7:
            tournament = random.sample(feasible_solutions, min(tournament_size, len(feasible_solutions)))
        else:
            tournament = random.sample(fitness_scores, min(tournament_size, len(fitness_scores)))
        
        return min(tournament, key=lambda x: x[1])[0]

    def _n_day_crossover(self, parent1: Dict, parent2: Dict) -> Tuple[Dict, Dict]:
        """Crossover for N-day individuals."""
        # Collect all attractions from both parents
        all_attractions = []
        for day in range(self.n_days):
            day_key = f'day{day+1}_attractions'
            all_attractions.extend(parent1[day_key])
        
        # Create two new random distributions
        attractions1 = all_attractions.copy()
        attractions2 = all_attractions.copy()
        random.shuffle(attractions1)
        random.shuffle(attractions2)
        
        # Create children with new distributions
        child1 = {}
        child2 = {}
        
        attractions_per_day = len(all_attractions) // self.n_days
        remainder = len(all_attractions) % self.n_days
        
        start_idx = 0
        for day in range(self.n_days):
            day_key = f'day{day+1}_attractions'
            
            attractions_today = attractions_per_day
            if day < remainder:
                attractions_today += 1
            
            end_idx = start_idx + attractions_today
            
            child1[day_key] = attractions1[start_idx:end_idx]
            child2[day_key] = attractions2[start_idx:end_idx]
            
            start_idx = end_idx
        
        return child1, child2

    def _n_day_mutate(self, individual: Dict, mutation_rate: float, 
                     hotel_indices: List[int]) -> Dict:
        """Mutation for N-day individual."""
        if random.random() < mutation_rate:
            individual = {key: attractions.copy() for key, attractions in individual.items()}
            
            # Choose mutation strategy
            strategies = ['swap_within_day', 'move_between_days', 'swap_between_days']
            strategy = random.choice(strategies)
            
            if strategy == 'swap_within_day':
                # Swap two attractions within same day
                day = random.randint(0, self.n_days - 1)
                day_key = f'day{day+1}_attractions'
                
                if len(individual[day_key]) >= 2:
                    i, j = random.sample(range(len(individual[day_key])), 2)
                    individual[day_key][i], individual[day_key][j] = \
                        individual[day_key][j], individual[day_key][i]
            
            elif strategy == 'move_between_days':
                # Move attraction from one day to another
                from_day = random.randint(0, self.n_days - 1)
                to_day = random.randint(0, self.n_days - 1)
                
                if from_day != to_day:
                    from_key = f'day{from_day+1}_attractions'
                    to_key = f'day{to_day+1}_attractions'
                    
                    if len(individual[from_key]) > 0:
                        attraction = individual[from_key].pop(random.randint(0, len(individual[from_key]) - 1))
                        individual[to_key].append(attraction)
            
            elif strategy == 'swap_between_days':
                # Swap attractions between two different days
                day1 = random.randint(0, self.n_days - 1)
                day2 = random.randint(0, self.n_days - 1)
                
                if day1 != day2:
                    key1 = f'day{day1+1}_attractions'
                    key2 = f'day{day2+1}_attractions'
                    
                    if individual[key1] and individual[key2]:
                        i = random.randint(0, len(individual[key1]) - 1)
                        j = random.randint(0, len(individual[key2]) - 1)
                        
                        individual[key1][i], individual[key2][j] = \
                            individual[key2][j], individual[key1][i]
        
        return individual

    def print_n_day_results(self, results: Dict):
        """Print comprehensive N-day results."""
        print("\n" + "="*100)
        print(f"🗓️ {results['n_days']}-DAY ROUTE OPTIMIZATION RESULTS")
        print("="*100)
        
        # Overall status
        feasibility_status = "✅ FEASIBLE" if results['best_is_feasible'] else "❌ INFEASIBLE"
        print(f"\nOverall Feasibility: {feasibility_status}")
        print(f"Feasible Solutions: {results['feasible_solutions_pct']:.1f}%")
        
        # Print each day
        for day in range(results['n_days']):
            day_num = day + 1
            day_key = f'day{day_num}'
            schedule = results[f'{day_key}_schedule']
            route = results[f'{day_key}_route']
            distance = results[f'{day_key}_distance']
            
            self._print_single_day_schedule(day_num, schedule, route, distance)
        
        # Overall summary
        print(f"\n🏆 OVERALL SUMMARY")
        print("-" * 60)
        print(f"Total Distance: {results['total_distance']:,.0f}m ({results['total_distance']/1000:.2f}km)")
        print(f"Average per day: {results['total_distance']/results['n_days']/1000:.2f}km")
        print(f"Execution Time: {results['execution_time']:.2f}s")
        print(f"Total Improvement: {results['improvement_percentage']:.1f}%")
        
        # Daily breakdown
        print(f"\n📊 DAILY BREAKDOWN")
        print("-" * 50)
        for day in range(results['n_days']):
            day_num = day + 1
            distance = results[f'day{day_num}_distance']
            schedule = results[f'day{day_num}_schedule']
            duration = schedule['total_duration_minutes']
            feasible_icon = "✅" if schedule['feasible'] else "❌"
            
            print(f"Day {day_num}: {distance/1000:5.2f}km | {duration//60}h{duration%60:02d}m | {feasible_icon}")

    def _print_single_day_schedule(self, day_num: int, schedule: Dict, route: List[int], distance: float):
        """Print detailed schedule for a single day."""
        hotel = self.hotels[day_num - 1]
        hotel_name = hotel['name']
        date_str = hotel['checkin'].strftime('%Y-%m-%d') if hotel['checkin'] else f"Day {day_num}"
        
        print(f"\n🌅 DAY {day_num} - {date_str}")
        print(f"🏨 Hotel: {hotel_name}")
        
        if schedule['feasible']:
            print("✅ Status: FEASIBLE")
        else:
            print("❌ Status: INFEASIBLE")
            for violation in schedule['constraint_violations']:
                print(f"   ⚠️ {violation}")
        
        print(f"📊 Distance: {distance:,.0f}m ({distance/1000:.2f}km)")
        print(f"⏱️ Duration: {schedule['total_duration_minutes']//60}h {schedule['total_duration_minutes']%60}m")
        print(f"🎯 Attractions: {len(route) - 2}")
        
        if len(schedule['timeline']) > 0:
            print("\n📅 Schedule:")
            print(f"{'Time':<12} {'Activity':<20} {'Location':<25} {'Duration':<10}")
            print("-" * 70)
            
            # Add breakfast
            print(f"07:00-08:00  🍳 Breakfast       {hotel_name:<25} 60 min")
            
            # Print timeline
            for item in schedule['timeline']:
                start_time = item['start_time'].strftime('%H:%M')
                end_time = item['end_time'].strftime('%H:%M')
                time_range = f"{start_time}-{end_time}"
                
                if item['type'] == 'travel':
                    activity = f"🚗 Travel"
                    location = f"{item.get('from', '')} → {item.get('to', '')}"[:25]
                else:
                    activity = f"🎯 Visit"
                    location = item.get('location', '')[:25]
                
                duration = f"{item['duration_minutes']} min"
                
                print(f"{time_range:<12} {activity:<20} {location:<25} {duration:<10}")

    

# ===============================
# Main Function for N-Day
# ===============================

    def main(self):
        print("🗓️ N-DAY MULTI-HOTEL ROUTE OPTIMIZATION")
        print("="*80)

        df = self.data
        df_locations = self.locations_df_df
        
        # Initialize N-day optimizer
        optimizer = GA_MultiOptimizer(df, df_locations)
        
        # Run N-day optimization
        results = optimizer.optimize_n_day_routes(
            population_size=200,
            generations=300,
            crossover_rate=0.85,
            mutation_rate=0.02,
            timing_weight=0.3,
            verbose=True
        )
        
        # Print comprehensive results
        optimizer.print_n_day_results(results)

        # Get path lines for each day
        all_path_lines = {}
        
        # Create location name mapping from indices
        location_names = [loc['name'] for loc in optimizer.all_locations]
        
        # Process each day's route
        for day in range(results['n_days']):
            day_num = day + 1
            day_key = f'day{day_num}'
            route_key = f'{day_key}_route'
            
            if route_key in results:
                day_route = results[route_key]
                day_path_lines = []
                
                print(f"🗺️ Processing {day_key} route: {day_route}")
                
                # Generate path lines for this day's route
                for i in range(len(day_route) - 1):
                    src_idx = day_route[i]
                    dest_idx = day_route[i + 1]
                    
                    # Get location names from indices
                    if src_idx < len(location_names) and dest_idx < len(location_names):
                        src_name = location_names[src_idx]
                        dest_name = location_names[dest_idx]
                        
                        print(f"   Processing path: {src_name} → {dest_name}")
                        
                        # Get coordinates from distance dataframe
                        src_coords = None
                        dest_coords = None
                        
                        # Try to get source coordinates
                        src_rows = self.distance_df[self.distance_df['Source'] == src_name]
                        if len(src_rows) > 0:
                            src_coords_str = src_rows.iloc[0].get('SourceCoordinates', None)
                            src_coords = optimizer._parse_coordinate_string(src_coords_str)
                        
                        # Fallback: get coordinates from location data
                        if src_coords is None:
                            src_location = next((loc for loc in optimizer.all_locations if loc['name'] == src_name), None)
                            if src_location:
                                src_coords = (src_location['latitude'], src_location['longitude'])
                        
                        # Try to get destination coordinates  
                        dest_rows = self.distance_df[self.distance_df['Destination'] == dest_name]
                        if len(dest_rows) > 0:
                            dest_coords_str = dest_rows.iloc[0].get('DestinationCoordinates', None)
                            dest_coords = optimizer._parse_coordinate_string(dest_coords_str)
                        
                        # Fallback: get coordinates from location data
                        if dest_coords is None:
                            dest_location = next((loc for loc in optimizer.all_locations if loc['name'] == dest_name), None)
                            if dest_location:
                                dest_coords = (dest_location['latitude'], dest_location['longitude'])
                        
                        # Get path data
                        path_data = self.distance_df[
                            (self.distance_df['Source'] == src_name) & 
                            (self.distance_df['Destination'] == dest_name)
                        ]['Path'].values
                        
                        # Check if we have path data and it's not null
                        has_valid_path = False
                        path_value = None
                        
                        if path_data.size > 0:
                            path_value = path_data[0]
                            # Check if the path value is not null/nan
                            if path_value is not None and not (isinstance(path_value, float) and pd.isna(path_value)):
                                if isinstance(path_value, str) and path_value.strip():
                                    has_valid_path = True
                                elif not isinstance(path_value, str):
                                    has_valid_path = True
                        
                        if has_valid_path:
                            parsed_path = GA.parse_path_coordinates(path_value)
                            detailed_path = {
                                'source_name': src_name,
                                'source_coords': src_coords,
                                'destination_coords': dest_coords,
                                'destination_name': dest_name,
                                'path_coordinates': parsed_path,
                                'day': day_num,
                                'segment': i + 1
                            }
                            day_path_lines.append(detailed_path)
                            print(f"   ✅ Added path with {len(parsed_path)} coordinates")
                        else:
                            # Create empty path entry for missing data
                            empty_path = {
                                'source_name': src_name,
                                'source_coords': src_coords,
                                'destination_coords': dest_coords,
                                'destination_name': dest_name,
                                'path_coordinates': [],
                                'day': day_num,
                                'segment': i + 1,
                                'note': 'No path data available'
                            }
                            day_path_lines.append(empty_path)
                            print(f"   ⚠️ No path data found for {src_name} → {dest_name}")
                    else:
                        print(f"   ❌ Invalid indices: src_idx={src_idx}, dest_idx={dest_idx}")
                
                all_path_lines[f'{day_key}_path_lines'] = day_path_lines
                print(f"✅ {day_key}: Generated {len(day_path_lines)} path segments")
            else:
                print(f"❌ Route key '{route_key}' not found in results")
        
        # Add all path lines to results
        results.update(all_path_lines)
        
        # Also create a combined path_lines for backward compatibility
        combined_path_lines = []
        for day in range(results['n_days']):
            day_num = day + 1
            day_key = f'day{day_num}_path_lines'
            if day_key in results:
                combined_path_lines.extend(results[day_key])
        
        results["path_lines"] = combined_path_lines
        
        print(f"🎯 Total path lines generated: {len(combined_path_lines)} across {results['n_days']} days")
        return results
        
    

    if __name__ == "__main__":
        main()