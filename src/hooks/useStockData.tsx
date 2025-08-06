import { useState, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minStock: number;
  description?: string;
  supplier?: string;
  createdAt: Date;
  createdBy: string; // ID do usuário que criou
  createdByName: string; // Nome do usuário que criou
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  creditLimit: number;
  currentDebt: number;
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  includesVAT: boolean;
  vatAmount: number;
  subtotal: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  customerId?: string;
  totalAmount: number;
  totalProfit: number;
  totalVATAmount: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  reference?: string;
  createdAt: Date;
}

export const useStockData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // Carregar dados do localStorage
  useEffect(() => {
    const loadData = () => {
      const savedProducts = localStorage.getItem('stockData_products');
      const savedCustomers = localStorage.getItem('stockData_customers');
      const savedSales = localStorage.getItem('stockData_sales');
      const savedMovements = localStorage.getItem('stockData_movements');

      if (savedProducts) {
        setProducts(JSON.parse(savedProducts).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt)
        })));
      } else {
        // Initialize with sample data only if no saved data
        initializeSampleData();
      }

      if (savedCustomers) {
        setCustomers(JSON.parse(savedCustomers).map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        })));
      }

      if (savedSales) {
        setSales(JSON.parse(savedSales).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        })));
      }

      if (savedMovements) {
        setStockMovements(JSON.parse(savedMovements).map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        })));
      }
    };

    loadData();
  }, []);

  // Salvar dados no localStorage sempre que mudarem
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('stockData_products', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (customers.length > 0) {
      localStorage.setItem('stockData_customers', JSON.stringify(customers));
    }
  }, [customers]);

  useEffect(() => {
    if (sales.length > 0) {
      localStorage.setItem('stockData_sales', JSON.stringify(sales));
    }
  }, [sales]);

  useEffect(() => {
    if (stockMovements.length > 0) {
      localStorage.setItem('stockData_movements', JSON.stringify(stockMovements));
    }
  }, [stockMovements]);

  const initializeSampleData = () => {
    const sampleProducts: Product[] = [
      {
        id: '1',
        name: 'iPhone 15 Pro',
        category: 'Telemóveis',
        purchasePrice: 800,
        salePrice: 1200,
        quantity: 15,
        minStock: 5,
        description: 'Smartphone Apple iPhone 15 Pro',
        supplier: 'Apple Inc.',
        createdAt: new Date('2024-01-15'),
        createdBy: '1',
        createdByName: 'Administrador'
      },
      {
        id: '2',
        name: 'Samsung Galaxy S24',
        category: 'Telemóveis',
        purchasePrice: 650,
        salePrice: 950,
        quantity: 8,
        minStock: 5,
        description: 'Smartphone Samsung Galaxy S24',
        supplier: 'Samsung',
        createdAt: new Date('2024-01-20'),
        createdBy: '1',
        createdByName: 'Administrador'
      },
      {
        id: '3',
        name: 'MacBook Air M3',
        category: 'Computadores',
        purchasePrice: 1000,
        salePrice: 1500,
        quantity: 3,
        minStock: 2,
        description: 'Laptop Apple MacBook Air com chip M3',
        supplier: 'Apple Inc.',
        createdAt: new Date('2024-02-01'),
        createdBy: '1',
        createdByName: 'Administrador'
      },
      {
        id: '4',
        name: 'AirPods Pro',
        category: 'Acessórios',
        purchasePrice: 150,
        salePrice: 250,
        quantity: 25,
        minStock: 10,
        description: 'Auriculares sem fios Apple AirPods Pro',
        supplier: 'Apple Inc.',
        createdAt: new Date('2024-02-10'),
        createdBy: '1',
        createdByName: 'Administrador'
      }
    ];

    const sampleCustomers: Customer[] = [
      {
        id: '1',
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '+351 912 345 678',
        address: 'Rua das Flores, 123, Lisboa',
        creditLimit: 2000,
        currentDebt: 450,
        createdAt: new Date('2024-01-10')
      },
      {
        id: '2',
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '+351 923 456 789',
        address: 'Avenida da Liberdade, 456, Porto',
        creditLimit: 1500,
        currentDebt: 0,
        createdAt: new Date('2024-01-15')
      }
    ];

    const sampleSales: Sale[] = [
      {
        id: '1',
        items: [
          {
            productId: '1',
            quantity: 2,
            unitPrice: 1200,
            includesVAT: false,
            vatAmount: 0,
            subtotal: 2400,
            total: 2400
          }
        ],
        customerId: '1',
        totalAmount: 2400,
        totalProfit: 800,
        totalVATAmount: 0,
        paymentMethod: 'credit',
        createdAt: new Date('2024-02-15')
      },
      {
        id: '2',
        items: [
          {
            productId: '4',
            quantity: 3,
            unitPrice: 250,
            includesVAT: true,
            vatAmount: 120,
            subtotal: 750,
            total: 870
          }
        ],
        totalAmount: 870,
        totalProfit: 300,
        totalVATAmount: 120,
        paymentMethod: 'cash',
        createdAt: new Date('2024-02-16')
      }
    ];

    setProducts(sampleProducts);
    setCustomers(sampleCustomers);
    setSales(sampleSales);
  };

  // Helper functions
  const getTotalStock = () => {
    return products.reduce((total, product) => total + product.quantity, 0);
  };

  const getTotalValue = () => {
    return products.reduce((total, product) => total + (product.quantity * product.purchasePrice), 0);
  };

  const getDailyProfit = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sales
      .filter(sale => sale.createdAt >= today)
      .reduce((total, sale) => total + sale.totalProfit, 0);
  };

  const getLowStockProducts = () => {
    return products.filter(product => product.quantity <= product.minStock);
  };

  const getTopSellingProducts = () => {
    try {
      console.log("Getting top selling products, sales:", sales);
      console.log("Products:", products);
      
      const productSales = products.map(product => {
        // Find all sale items for this product across all sales
        const productSaleItems = sales
          .filter(sale => sale && sale.items && Array.isArray(sale.items))
          .flatMap(sale => sale.items)
          .filter(item => item && item.productId === product.id);
        
        console.log(`Product ${product.name} sale items:`, productSaleItems);
        
        const totalSold = productSaleItems.reduce((total, item) => {
          return total + (item?.quantity || 0);
        }, 0);
        
        return {
          name: product.name,
          quantity: totalSold
        };
      }).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

      console.log("Product sales result:", productSales);
      return productSales;
    } catch (error) {
      console.error("Error in getTopSellingProducts:", error);
      return [];
    }
  };

  const getSalesData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('pt-PT', { weekday: 'short' });
      
      const dayTotal = sales
        .filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate.toDateString() === date.toDateString();
        })
        .reduce((total, sale) => total + sale.totalAmount, 0);

      last7Days.push({
        date: dateStr,
        amount: dayTotal
      });
    }
    return last7Days;
  };

  const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>, currentUser: { id: string; name: string }) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: new Date(),
      createdBy: currentUser.id,
      createdByName: currentUser.name
    };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(product => 
      product.id === id ? { ...product, ...updates } : product
    ));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === id ? { ...customer, ...updates } : customer
    ));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
  };

  const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const newSale: Sale = {
      ...sale,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    // Update product quantities
    sale.items.forEach(item => {
      setProducts(prev => prev.map(product => 
        product.id === item.productId 
          ? { ...product, quantity: product.quantity - item.quantity }
          : product
      ));
    });

    // Update customer debt if credit sale
    if (sale.customerId && sale.paymentMethod === 'credit') {
      setCustomers(prev => prev.map(customer =>
        customer.id === sale.customerId
          ? { ...customer, currentDebt: customer.currentDebt + sale.totalAmount }
          : customer
      ));
    }

    setSales(prev => [...prev, newSale]);
    
    // Add stock movements for each item
    sale.items.forEach(item => {
      const movement: StockMovement = {
        id: Date.now().toString() + '_' + item.productId + '_movement',
        productId: item.productId,
        type: 'out',
        quantity: item.quantity,
        reason: 'Venda',
        reference: newSale.id,
        createdAt: new Date()
      };
      setStockMovements(prev => [...prev, movement]);
    });
    
    return newSale;
  };

  const addStockMovement = (movement: Omit<StockMovement, 'id' | 'createdAt'>) => {
    const newMovement: StockMovement = {
      ...movement,
      id: Date.now().toString(),
      createdAt: new Date()
    };

    // Update product quantity
    setProducts(prev => prev.map(product => 
      product.id === movement.productId 
        ? { 
            ...product, 
            quantity: movement.type === 'in' 
              ? product.quantity + movement.quantity
              : product.quantity - movement.quantity
          }
        : product
    ));

    setStockMovements(prev => [...prev, newMovement]);
    return newMovement;
  };

  return {
    products,
    customers,
    sales,
    stockMovements,
    getTotalStock,
    getTotalValue,
    getDailyProfit,
    getLowStockProducts,
    getTopSellingProducts,
    getSalesData,
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSale,
    addStockMovement
  };
};
