
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  image_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT false,
  on_sale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);

-- wishlist
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist all" ON public.wishlist_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- cart
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart all" ON public.cart_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders select" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own orders insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed products
INSERT INTO public.products (slug, name, category, price, original_price, image_url, description, ingredients, nutrition, featured, on_sale) VALUES
('classic-vanilla-cake','Classic Vanilla Dream Cake','Cakes',38.00,NULL,'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80','A three-layer vanilla sponge wrapped in silky French buttercream and finished with edible gold leaf.', ARRAY['Flour','Butter','Sugar','Eggs','Vanilla bean','Cream'], '{"calories":340,"protein":"4g","carbs":"42g","fat":"18g"}'::jsonb, true, false),
('belgian-chocolate-cake','Belgian Chocolate Indulgence','Cakes',42.00,NULL,'https://images.unsplash.com/photo-1565808229224-264b6c1afebf?w=800&q=80','Rich dark chocolate layers filled with chocolate ganache and dusted with cocoa.', ARRAY['Dark chocolate','Cocoa','Butter','Sugar','Eggs','Flour'], '{"calories":410,"protein":"5g","carbs":"48g","fat":"22g"}'::jsonb, true, false),
('strawberry-shortcake','Strawberry Garden Shortcake','Cakes',36.00,45.00,'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80','Light vanilla sponge layered with whipped cream and fresh strawberries.', ARRAY['Strawberries','Cream','Vanilla','Flour','Sugar'], '{"calories":290,"protein":"3g","carbs":"38g","fat":"14g"}'::jsonb, false, true),
('red-velvet-cake','Red Velvet Royale','Cakes',40.00,NULL,'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=800&q=80','Velvety red cocoa cake with tangy cream cheese frosting.', ARRAY['Cocoa','Buttermilk','Cream cheese','Sugar','Flour'], '{"calories":380,"protein":"4g","carbs":"45g","fat":"20g"}'::jsonb, true, false),
('matcha-cake','Kyoto Matcha Cloud Cake','Cakes',44.00,NULL,'https://images.unsplash.com/photo-1519869325930-281384150729?w=800&q=80','Stone-ground matcha sponge with white chocolate mousse.', ARRAY['Matcha','White chocolate','Cream','Eggs','Flour'], '{"calories":320,"protein":"5g","carbs":"36g","fat":"17g"}'::jsonb, false, false),

('vanilla-cupcake','Vanilla Bean Cupcake','Cupcakes',5.50,NULL,'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80','Buttery vanilla cupcake crowned with swirled buttercream.', ARRAY['Vanilla','Butter','Sugar','Eggs','Flour'], '{"calories":220,"protein":"2g","carbs":"28g","fat":"11g"}'::jsonb, true, false),
('chocolate-cupcake','Double Chocolate Cupcake','Cupcakes',5.50,NULL,'https://images.unsplash.com/photo-1599785209707-a456fc1337b8?w=800&q=80','Moist chocolate cupcake with rich fudge frosting.', ARRAY['Chocolate','Cocoa','Butter','Sugar','Eggs'], '{"calories":260,"protein":"3g","carbs":"32g","fat":"14g"}'::jsonb, false, false),
('red-velvet-cupcake','Red Velvet Mini','Cupcakes',6.00,NULL,'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=800&q=80','Petite red velvet with cream cheese rosette.', ARRAY['Cocoa','Cream cheese','Sugar','Butter'], '{"calories":240,"protein":"3g","carbs":"30g","fat":"12g"}'::jsonb, true, false),
('lemon-cupcake','Lemon Meringue Cupcake','Cupcakes',6.00,NULL,'https://images.unsplash.com/photo-1607478900766-efe13248b125?w=800&q=80','Zesty lemon cake topped with toasted Italian meringue.', ARRAY['Lemon','Sugar','Eggs','Flour','Butter'], '{"calories":210,"protein":"2g","carbs":"30g","fat":"10g"}'::jsonb, false, false),
('caramel-cupcake','Salted Caramel Cupcake','Cupcakes',6.50,8.00,'https://images.unsplash.com/photo-1426869981800-95ebf51ce900?w=800&q=80','Brown butter cake filled with salted caramel.', ARRAY['Caramel','Butter','Sea salt','Sugar','Eggs'], '{"calories":280,"protein":"3g","carbs":"34g","fat":"15g"}'::jsonb, false, true),

('butter-croissant','Golden Butter Croissant','Pastries',4.50,NULL,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80','Hand-laminated croissant with 81 layers of French butter.', ARRAY['Flour','French butter','Yeast','Milk','Sugar'], '{"calories":260,"protein":"5g","carbs":"28g","fat":"14g"}'::jsonb, true, false),
('almond-croissant','Almond Croissant','Pastries',5.50,NULL,'https://images.unsplash.com/photo-1568827999250-3f6afff96e66?w=800&q=80','Croissant filled with almond cream and topped with sliced almonds.', ARRAY['Almond','Butter','Flour','Sugar','Eggs'], '{"calories":340,"protein":"7g","carbs":"32g","fat":"20g"}'::jsonb, false, false),
('pain-au-chocolat','Pain au Chocolat','Pastries',5.00,NULL,'https://images.unsplash.com/photo-1623334044303-241021148842?w=800&q=80','Buttery laminated dough wrapped around dark chocolate batons.', ARRAY['Flour','Butter','Dark chocolate','Yeast'], '{"calories":300,"protein":"6g","carbs":"30g","fat":"18g"}'::jsonb, true, false),
('cinnamon-roll','Cinnamon Swirl Roll','Pastries',4.50,NULL,'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800&q=80','Warm cinnamon-sugar swirl glazed with cream cheese frosting.', ARRAY['Cinnamon','Brown sugar','Cream cheese','Flour'], '{"calories":380,"protein":"5g","carbs":"52g","fat":"16g"}'::jsonb, false, false),
('danish-fruit','Seasonal Fruit Danish','Pastries',5.50,NULL,'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80','Flaky danish with vanilla custard and fresh seasonal fruit.', ARRAY['Custard','Seasonal fruit','Puff pastry','Sugar'], '{"calories":290,"protein":"4g","carbs":"36g","fat":"14g"}'::jsonb, false, false),

('choc-chip-cookie','Classic Choc Chip Cookie','Cookies',3.50,NULL,'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80','Chewy edges, soft center, packed with Belgian chocolate chunks.', ARRAY['Butter','Brown sugar','Chocolate','Flour','Eggs'], '{"calories":210,"protein":"2g","carbs":"28g","fat":"11g"}'::jsonb, true, false),
('macaron-box','French Macaron Box of 6','Cookies',18.00,22.00,'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=800&q=80','Assorted French macarons in six classic flavors.', ARRAY['Almond flour','Egg whites','Sugar','Buttercream'], '{"calories":80,"protein":"1g","carbs":"12g","fat":"3g"}'::jsonb, true, true),
('oatmeal-raisin','Oatmeal Raisin Cookie','Cookies',3.00,NULL,'https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800&q=80','Hearty oats and plump raisins with hints of cinnamon.', ARRAY['Oats','Raisins','Cinnamon','Butter','Flour'], '{"calories":190,"protein":"3g","carbs":"30g","fat":"8g"}'::jsonb, false, false),
('shortbread','Scottish Shortbread','Cookies',3.50,NULL,'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80','Crumbly buttery shortbread dusted with vanilla sugar.', ARRAY['Butter','Sugar','Flour','Vanilla'], '{"calories":150,"protein":"2g","carbs":"18g","fat":"9g"}'::jsonb, false, false),

('sourdough','Artisan Sourdough Loaf','Bread',8.50,NULL,'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=800&q=80','24-hour fermented sourdough with a crackling crust.', ARRAY['Heritage flour','Water','Sea salt','Sourdough starter'], '{"calories":160,"protein":"6g","carbs":"32g","fat":"1g"}'::jsonb, true, false),
('baguette','Traditional French Baguette','Bread',5.50,NULL,'https://images.unsplash.com/photo-1568471173242-461f0a730452?w=800&q=80','Crisp crust, airy crumb, baked twice daily.', ARRAY['Flour','Water','Yeast','Salt'], '{"calories":180,"protein":"6g","carbs":"36g","fat":"1g"}'::jsonb, false, false),
('brioche','Honey Butter Brioche','Bread',9.50,NULL,'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80','Pillowy brioche enriched with honey and cultured butter.', ARRAY['Eggs','Butter','Honey','Flour','Milk'], '{"calories":280,"protein":"7g","carbs":"34g","fat":"12g"}'::jsonb, false, false),
('focaccia','Rosemary Sea Salt Focaccia','Bread',7.50,NULL,'https://images.unsplash.com/photo-1591985666643-1ecc67616216?w=800&q=80','Pillowy focaccia drizzled with olive oil, rosemary, and flaky salt.', ARRAY['Olive oil','Rosemary','Flour','Sea salt'], '{"calories":210,"protein":"5g","carbs":"30g","fat":"8g"}'::jsonb, false, false),

('glazed-donut','Honey Glazed Donut','Donuts',3.50,NULL,'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80','Cloud-like brioche donut dipped in honey vanilla glaze.', ARRAY['Flour','Honey','Vanilla','Eggs','Sugar'], '{"calories":240,"protein":"3g","carbs":"34g","fat":"10g"}'::jsonb, true, false),
('chocolate-donut','Dark Chocolate Donut','Donuts',4.00,NULL,'https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=800&q=80','Cake donut coated in dark chocolate glaze.', ARRAY['Cocoa','Chocolate','Butter','Sugar','Flour'], '{"calories":280,"protein":"4g","carbs":"36g","fat":"14g"}'::jsonb, false, false),
('strawberry-donut','Pink Strawberry Donut','Donuts',4.00,NULL,'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&q=80','Soft donut dipped in real strawberry glaze and sprinkles.', ARRAY['Strawberry','Sugar','Sprinkles','Flour'], '{"calories":260,"protein":"3g","carbs":"38g","fat":"11g"}'::jsonb, true, false),
('boston-cream','Boston Cream Donut','Donuts',4.50,NULL,'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=800&q=80','Filled with vanilla custard and topped with chocolate ganache.', ARRAY['Custard','Chocolate','Vanilla','Flour'], '{"calories":310,"protein":"5g","carbs":"38g","fat":"15g"}'::jsonb, false, false),
('cinnamon-sugar-donut','Cinnamon Sugar Cake Donut','Donuts',3.50,NULL,'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80','Old-fashioned cake donut tossed in cinnamon sugar.', ARRAY['Cinnamon','Sugar','Flour','Butter'], '{"calories":230,"protein":"3g","carbs":"32g","fat":"10g"}'::jsonb, false, false),

('birthday-bundle','Birthday Celebration Bundle','Special Offers',55.00,75.00,'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80','Custom cake, 12 cupcakes, and a box of macarons — perfect for celebrations.', ARRAY['Assorted cakes','Cupcakes','Macarons'], '{"servings":"10-12"}'::jsonb, true, true),
('breakfast-box','Sunrise Breakfast Box','Special Offers',24.00,32.00,'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&q=80','Two croissants, two danishes, and a fresh baguette — start the day right.', ARRAY['Croissants','Danishes','Baguette'], '{"servings":"4"}'::jsonb, true, true),
('weekend-treat','Weekend Sweet Tasting','Special Offers',32.00,40.00,'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80','Six cupcakes, six cookies, and four donuts — a tasting of our best sellers.', ARRAY['Cupcakes','Cookies','Donuts'], '{"servings":"6-8"}'::jsonb, false, true);
