CREATE TABLE IF NOT EXISTS integration_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  endpoint VARCHAR(255),
  last_sync_time TIMESTAMP,
  status ENUM('active', 'inactive') DEFAULT 'inactive',
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  local_product_id INT NOT NULL,
  external_product_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  last_sync_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (local_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  local_order_id INT NOT NULL,
  external_order_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  last_sync_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (local_order_id) REFERENCES orders(id) ON DELETE CASCADE
);