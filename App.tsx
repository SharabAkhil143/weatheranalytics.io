

// FIX: Corrected React import statement and imported getWeatherDataForCity from the weather service.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getWeatherDataForCity, getCitySuggestions } from './services/weatherService';
import { WeatherData, CitySuggestion } from './types';
import WeatherCard, { WeatherCardSkeleton } from './components/WeatherCard';
import CityDetailView from './components/CityDetailView';
import { SunIcon, MoonIcon } from './components/icons';

type WeatherState = {
    [key: string]: {
        data?: WeatherData;
        isLoading: boolean;
        error?: string;
        timestamp?: number;
    }
}

const App: React.FC = () => {
    const [cities, setCities] = useState<string[]>(() => {
        const saved = localStorage.getItem('weather-cities');
        return saved ? JSON.parse(saved) : ['New York', 'London', 'Tokyo'];
    });

    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('weather-favorites');
        return saved ? JSON.parse(saved) : ['New York'];
    });

    const [weatherData, setWeatherData] = useState<WeatherState>({});
    const [unit, setUnit] = useState<'C' | 'F'>(() => (localStorage.getItem('weather-unit') as 'C' | 'F') || 'C');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('weather-theme') as 'light' | 'dark') || 'light');
    const [selectedCity, setSelectedCity] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        localStorage.setItem('weather-cities', JSON.stringify(cities));
    }, [cities]);
    
    useEffect(() => {
        localStorage.setItem('weather-favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        localStorage.setItem('weather-unit', unit);
    }, [unit]);

    useEffect(() => {
        localStorage.setItem('weather-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const fetchWeatherData = useCallback(async (city: string, force = false) => {
        const cityKey = city.toLowerCase();
        const now = Date.now();
        const cityState = weatherData[cityKey];

        if (!force && cityState && cityState.data && cityState.timestamp && (now - cityState.timestamp < 60000)) {
            return;
        }

        setWeatherData(prev => ({ ...prev, [cityKey]: { ...prev[cityKey], isLoading: true } }));
        try {
            const data = await getWeatherDataForCity(city, unit);
            setWeatherData(prev => ({ ...prev, [cityKey]: { data, isLoading: false, timestamp: Date.now() } }));
        } catch (error) {
            setWeatherData(prev => ({ ...prev, [cityKey]: { ...prev[cityKey], isLoading: false, error: (error as Error).message } }));
        }
    }, [unit, weatherData]);

    useEffect(() => {
        cities.forEach(city => fetchWeatherData(city));
        const interval = setInterval(() => {
            cities.forEach(city => fetchWeatherData(city, true));
        }, 60000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cities, unit]);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }
        const handler = setTimeout(async () => {
            setIsSearching(true);
            const citySuggestions = await getCitySuggestions(searchQuery);
            setSuggestions(citySuggestions);
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleAddCity = (city: string) => {
        if (!cities.find(c => c.toLowerCase() === city.toLowerCase()) && cities.length < 10) {
            const newCities = [...cities, city];
            setCities(newCities);
            fetchWeatherData(city);
        }
        setSearchQuery('');
        setSuggestions([]);
    };

    const handleRemoveCity = (cityToRemove: string) => {
        setCities(cities.filter(city => city.toLowerCase() !== cityToRemove.toLowerCase()));
        setFavorites(favorites.filter(fav => fav.toLowerCase() !== cityToRemove.toLowerCase()));
        setWeatherData(prev => {
            const newState = { ...prev };
            delete newState[cityToRemove.toLowerCase()];
            return newState;
        });
    };

    const handleFavoriteToggle = (cityToToggle: string) => {
        const cityKey = cityToToggle.toLowerCase();
        if (favorites.map(f => f.toLowerCase()).includes(cityKey)) {
            setFavorites(favorites.filter(fav => fav.toLowerCase() !== cityKey));
        } else {
            if (favorites.length < 10) {
                setFavorites([...favorites, cityToToggle]);
            }
        }
    };

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    const toggleUnit = () => setUnit(unit === 'C' ? 'F' : 'C');

    const handleSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        let _cities = [...cities];
        const draggedItemContent = _cities.splice(dragItem.current, 1)[0];
        _cities.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setCities(_cities);
    };

    const sortedCities = [...cities].sort((a, b) => {
        const aIsFav = favorites.map(f => f.toLowerCase()).includes(a.toLowerCase());
        const bIsFav = favorites.map(f => f.toLowerCase()).includes(b.toLowerCase());
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return 0;
    });

    if (selectedCity) {
        const cityData = weatherData[selectedCity.toLowerCase()]?.data;
        if (cityData) {
            return <CityDetailView data={cityData} unit={unit} onBack={() => setSelectedCity(null)} />;
        }
    }

    return (
        <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark transition-colors duration-300">
            <header className="p-4 md:p-6 flex justify-between items-center sticky top-0 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md z-10">
                <h1 className="text-2xl md:text-3xl font-bold text-primary-light dark:text-primary-dark">Weather Dashboard</h1>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search city..."
                            className="bg-secondary-light dark:bg-secondary-dark rounded-full py-2 px-4 w-40 md:w-64 focus:outline-none focus:ring-2 focus:ring-primary-light"
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute top-full mt-2 w-full bg-secondary-light dark:bg-secondary-dark rounded-lg shadow-xl z-20">
                                {suggestions.map((s, i) => (
                                    <li key={i} onClick={() => handleAddCity(s.name)} className="px-4 py-2 cursor-pointer hover:bg-primary-light/20 dark:hover:bg-primary-dark/20">
                                        {s.name}, <span className="text-sm text-gray-500">{s.country}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button onClick={toggleUnit} className="p-2 rounded-full bg-secondary-light dark:bg-secondary-dark">
                        <span className="font-bold">°{unit}</span>
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-secondary-light dark:bg-secondary-dark">
                        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {sortedCities.map((city, index) => {
                        const cityKey = city.toLowerCase();
                        const cityState = weatherData[cityKey];
                        if (cityState?.isLoading && !cityState.data) {
                            return <WeatherCardSkeleton key={cityKey} />;
                        }
                        if (cityState?.data) {
                            return (
                                <div
                                    key={cityKey}
                                    draggable
                                    onDragStart={() => dragItem.current = index}
                                    onDragEnter={() => dragOverItem.current = index}
                                    onDragEnd={handleSort}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <WeatherCard
                                        data={cityState.data}
                                        unit={unit}
                                        onClick={() => setSelectedCity(city)}
                                        onFavoriteToggle={() => handleFavoriteToggle(city)}
                                        isFavorite={favorites.map(f=>f.toLowerCase()).includes(cityKey)}
                                        onRemove={() => handleRemoveCity(city)}
                                    />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </main>
        </div>
    );
};

export default App;
