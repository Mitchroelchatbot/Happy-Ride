export type Transmission = 'manual' | 'automatic';

export type Car = {
  id: string;
  name: string;
  transmission: Transmission;
  seats: number;
  luggage: number;
  airco: boolean;
  pricePerDayCents: number;
  photoUrl: string | null;
  isPlaceholderPhoto: boolean;
};
