# -----------\ Name \--------------------------------------------------------- #

NAME    := Stalker

# -----------\ Files \-------------------------------------------------------- #

ENV_FILE = --env-file .env
COMPOSE = docker-compose.yml
COMPOSE_CMD = docker compose -f $(COMPOSE) $(ENV_FILE)  # Correct variable expansion

# -----------\ Rules \-------------------------------------------------------- #

all: $(NAME)

$(NAME):
	@$(COMPOSE_CMD) up

run:
	@$(COMPOSE_CMD) build
	@$(COMPOSE_CMD) up

build:
	@$(COMPOSE_CMD) up --build

down:
	@$(COMPOSE_CMD) down

# Use docker-compose down to remove this project-specific resources
clean:
	@$(COMPOSE_CMD) down  # Stop and remove containers defined in docker-compose.yml
	@$(COMPOSE_CMD) rm -f # Remove stopped containers 
	@docker image prune -a -f # Remove unused images

# Use fclean only if desired to remove all Docker Containers from the system
fclean: clean
	docker system prune -f #Remove all unused containers, images, networks, and optionally, build caches

re: clean all

.PHONY: all build down re clean fclean