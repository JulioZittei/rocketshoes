import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
import { usePrevious } from './usePrevious';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = usePrevious(cart);
  const cartPreviousValue = prevCartRef ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productAlreadyExists = updatedCart.find((product) => product.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`).then((response) => response.data);

      const stockAmount = stock.amount;
      const currentAmount = productAlreadyExists ? productAlreadyExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyExists) {
        productAlreadyExists.amount = amount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`).then((response) => response.data);
        const newProduct = {
          ...product,
          amount,
        };
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex((product) => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get<Stock>(`/stock/${productId}`).then((response) => response.data);
      const stockAmount = stock.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productAlreadyExists = updatedCart.find((product) => product.id === productId);

      if (productAlreadyExists) {
        productAlreadyExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
