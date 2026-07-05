echo "EXPO_PUBLIC_API_URL=http://$(ifconfig | grep netmask | tail -n1 | cut -d' ' -f2):8080" > .env
npm run start
