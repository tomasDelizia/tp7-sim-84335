import { Cliente } from "../modelo/Cliente";
import { Zapatero } from "../modelo/Zapatero";
import { TipoEvento } from "../modelo/TipoEvento";
import { ParZapatos } from "../modelo/ParZapatos";
import { Utils } from "../utils/Utils";
import { EstadoCliente } from "../modelo/EstadoCliente";
import { EstadoParZapatos } from "../modelo/EstadoParZapatos";

export class Simulador {
  private mediaLlegadasClientes: number;
  
  private tiempoAtencionClienteA: number;
  private tiempoAtencionClienteB: number;

  private tiempoReparacionZapatosA: number;
  private tiempoReparacionZapatosB: number;
  private tiempoSecado: number;

  private matrizEventos: string[][];
  private matrizClientes: string[][];
  private matrizZapatos: string[][];

  private cantMaxClientes: number;
  private cantMaxParZapatos: number;
  
  private probObjetivosVisita: number[];

  private tiempoPromedioReparacion: number = 0;
  private cantMaxZapatosEnColaReparacion: number = 0;
  private cantMaxClientesEnCola: number = 0;
  private tiempoPromedioAtencion: number = 0;
  private porcentajeClientesRechazados: number = 0;

  public simular(
    cantEventos: number,
    eventoDesde: number,
    probRetiro: number,
    probPedido: number,
    mediaLlegadaClientes: number,
    tiempoAtencionClienteA: number, 
    tiempoAtencionClienteB: number,
    tiempoReparacionZapatosA: number,
    tiempoReparacionZapatosB: number,
    tiempoSecado: number
    ): void {
    this.mediaLlegadasClientes = mediaLlegadaClientes;
    this.tiempoAtencionClienteA = tiempoAtencionClienteA;
    this.tiempoAtencionClienteB = tiempoAtencionClienteB;
    this.tiempoReparacionZapatosA = tiempoReparacionZapatosA;
    this.tiempoReparacionZapatosB = tiempoReparacionZapatosB;
    this.tiempoSecado = tiempoSecado;
    this.probObjetivosVisita = [probRetiro, probPedido];
    this.matrizEventos = [];
    this.matrizClientes = [];
    this.matrizZapatos = [];
    this.cantMaxClientes = 0;
    this.cantMaxParZapatos = 0;

    // Definimos el rango de filas que vamos a mostrar.
    let indiceHasta: number = eventoDesde + 399;
    if (indiceHasta > cantEventos - 1)
      indiceHasta = cantEventos;

    // Vector de estado de la iteración actual.
    let evento: string[] = [];
    let clientesEvento: string[] = [];
    let zapatosEvento: string[] = [];

    let tipoEvento: TipoEvento;
    let reloj: number = 0;
    let relojHoras: Date = new Date();
    let dia: number = 1;

    // Llegada de un cliente.
    let rndLlegada: number = -1;
    let tiempoEntreLlegadas: number = -1;
    let proximaLlegada: number = -1;

    // Atención de cliente.
    let rndObjetivoVisita: number = -1;
    let objetivoVisita: string = '';
    let rndAtencion: number = -1;
    let tiempoAtencion: number = -1;
    let finAtencion: number = -1;

    // Reparación de zapatos.
    let rndReparacion: number = -1;
    let tiempoReparacion: number = -1;
    tiempoSecado = -1;
    let finReparacion: number = -1;

    // Empleado.
    let zapatero = new Zapatero();
    let colaClientes: Cliente[] = [];
    let tiempoRemanenteReparacion: number = -1;
    let colaZapatosAReparar: ParZapatos[] = [];
    let colaZapatosListos: ParZapatos[] = [];

    // Clientes en el sistema.
    let clientesEnSistema: Cliente[] = [];

    // Par de zapatos en el sistema.
    let parZapatosEnSistema: ParZapatos[] = [];

    // Métricas.
    let acumuladorTiempoReparacion: number = 0;
    let cantZapatosReparados: number = 0;
    let cantMaxZapatosEnColaReparacion: number = 0;
    let cantMaxClientesEnCola: number = 0;
    let acumuladorTiempoAtencion: number = 0;
    let cantClientesAtendidos: number = 0;
    let cantClientesRechazados: number = 0;
    let cantClientesIngresados: number = 0;
    let cantZapatosIngresados: number = 0;

    for (let i: number = 0; i < cantEventos; i++) {
      evento = [];
      clientesEvento = [];
      zapatosEvento = [];
      // El evento es el inicio de la simulación.
      if (i == 0) tipoEvento = TipoEvento.INICIO_SIMULACION;
      // El evento es el fin de la simulación.
      else if (i == cantEventos - 1) tipoEvento = TipoEvento.FIN_SIMULACION;
      // El evento es un inicio de jornada: no se reciben pedidos y ya no hay zapatos para reparar, así que comienza un nuevo día a las 8hs.
      else if (!zapatero.estaRecibiendoPedidos() && zapatero.estaLibre() && colaZapatosListos.length === 0) tipoEvento = TipoEvento.INICIO_JORNADA;
      else {
        let eventosCandidatos: number[] = [
          proximaLlegada,
          finAtencion,
          finReparacion
        ];
        reloj = Utils.getMenorMayorACero(eventosCandidatos);
        tipoEvento = this.getSiguienteEvento(eventosCandidatos);
      }
      // El evento es un fin de recepción de pedidos: todos los días a las 16hs.
      if (reloj >= 480 && zapatero.estaRecibiendoPedidos()) tipoEvento = TipoEvento.FIN_RECEPCION_PEDIDOS;

      // Actualizamos el reloj en formato hh:mm:ss
      relojHoras.setHours(8, reloj, (reloj - Math.trunc(reloj)) * 60);

      switch (tipoEvento) {
        // Inicio de la simulación.
        case TipoEvento.INICIO_SIMULACION: {
          // El reloj inicia a las 8hs.
          relojHoras.setHours(8, 0, 0);

          // Cálculo de la próxima llegada.
          rndLlegada = Math.random();
          tiempoEntreLlegadas = this.getTiempoEntreLlegadas(rndLlegada);
          proximaLlegada = reloj + tiempoEntreLlegadas;

          // Carga de condiciones iniciales.
          for (let i: number = 1; i <= 10; i++) {
            cantZapatosIngresados++;
            let parZapatosReparados: ParZapatos = new ParZapatos(i, -1);
            parZapatosReparados.terminarReparacion();
            parZapatosEnSistema.push(parZapatosReparados);
            colaZapatosListos.push(parZapatosReparados);
          }
          break;
        }

        // Llegada de un cliente.
        case TipoEvento.LLEGADA_CLIENTE: {
          // Generamos la llegada del próximo cliente.
          rndLlegada = Math.random();
          tiempoEntreLlegadas = this.getTiempoEntreLlegadas(rndLlegada);
          proximaLlegada = reloj + tiempoEntreLlegadas;
          
          // Obtenemos el objetivo de la visita.
          rndObjetivoVisita = Math.random();
          objetivoVisita = this.getObjetivoVisita(rndObjetivoVisita);
          
          // Actualizamos contador de pacientes que alguna vez ingresaron al sistema.
          cantClientesIngresados++;

          // Creamos el objeto cliente.
          let cliente: Cliente = new Cliente(cantClientesIngresados, reloj);
          clientesEnSistema.push(cliente);

          switch (objetivoVisita) {
            // Llega un cliente que quiere retirar un par de zapatos reparados.
            case "Retiro": {
              // Preguntamos si el zapatero está libre o reparando.
              if (zapatero.estaParaAtender()) {
                // Si estaba reparando, deja la reparación pendiente y atiende al cliente.
                if (zapatero.estaReparando()) {
                  // Cálculo del tiempo remanente de reparación.
                  tiempoRemanenteReparacion = finReparacion - reloj;
                  finReparacion = -1;

                  // Buscamos el par de zapatos que estaba siendo reparado, y actualizamos su estado.
                  let parZapatosAPausar: ParZapatos = parZapatosEnSistema.find(parZapatos => parZapatos.estaEnReparacion());
                  parZapatosAPausar.pausarReparacion();
                }
                cliente.retirandoZapatos();
                zapatero.atendiendo();
      
                // Generamos el tiempo de atención.
                rndAtencion = Math.random();
                tiempoAtencion = this.getTiempoAtencion(rndAtencion);
                finAtencion = reloj + tiempoAtencion;
              }
              // Si estaba atendiendo otro cliente, va a la cola.
              else {
                cliente.enEsperaRetiro();
                colaClientes.push(cliente);
              }
              break;
            }
  
            // Llega un cliente que quiere realizar un pedido de reparación de un par de zapatos.
            case "Pedido": {
              // Preguntamos si el zapatero está libre o reparando, y si está recibiendo pedidos.
              if (zapatero.estaParaAtender() && zapatero.estaRecibiendoPedidos()) {
                // Si estaba reparando, deja la reparación pendiente y atiende al cliente.
                if (zapatero.estaReparando()) {
                  // Cálculo del tiempo remanente de reparación.
                  tiempoRemanenteReparacion = finReparacion - reloj;
                  finReparacion = -1;

                  // Buscamos el par de zapatos que estaba siendo reparado, y actualizamos su estado.
                  let parZapatosAPausar: ParZapatos = parZapatosEnSistema.find(parZapatos => parZapatos.estaEnReparacion());
                  parZapatosAPausar.pausarReparacion();
                }
                cliente.haciendoPedido();
                zapatero.atendiendo();
  
                // Generamos el tiempo de atención.
                rndAtencion = Math.random();
                tiempoAtencion = this.getTiempoAtencion(rndAtencion);
                finAtencion = reloj + tiempoAtencion;
              }
              // Si estaba atendiendo otro cliente, va a la cola.
              else if (zapatero.estaAtendiendo() && zapatero.estaRecibiendoPedidos()) {
                cliente.enEsperaPedido();
                colaClientes.push(cliente);
              }
              // No está recibiendo pedidos, se va del sistema.
              else {
                cantClientesRechazados++;
                clientesEnSistema.pop();
              }
              break;
            }
          }
          break;
        }

        // Fin de atención de cliente.
        case TipoEvento.FIN_ATENCION: {
          finAtencion = -1;

          // Buscamos el cliente atendido.
          let indiceClienteAtendido: number = clientesEnSistema.findIndex(cliente => cliente.estaSiendoAtendido());
          let clienteAtendido: Cliente = clientesEnSistema[indiceClienteAtendido];

          // Actualizamos el contador de clientes atendidos con éxito y el acumulador de tiempo de atención.
          cantClientesAtendidos++;
          acumuladorTiempoAtencion += reloj - clienteAtendido.getMinutoLlegada();

          switch (clienteAtendido.getEstado()) {
            // El cliente siendo atendido estaba retirando un par de zapatos.
            case (EstadoCliente.RETIRANDO_ZAPATOS): {
              // Preguntamos si había zapatos listos para retirar.
              if (colaZapatosListos.length > 0) {
                // Quitamos un par de zapatos listos de la cola y del sistema.
                let parZapatosARetirar: ParZapatos = colaZapatosListos.shift();
                let indiceZapatos: number = parZapatosEnSistema.findIndex(parZapatos => parZapatos === parZapatosARetirar);
                parZapatosEnSistema.splice(indiceZapatos, 1);
              }
              // No había zapatos listos, se rechaza el cliente.
              else {
                cantClientesAtendidos--;
                cantClientesRechazados++;
              }
              break;
            }
            // El cliente siendo atendido estaba haciendo un pedido de reparación.
            case (EstadoCliente.HACIENDO_PEDIDO): {
              // Ingresa un nuevo par de zapatos al sistema.
              cantZapatosIngresados++;
              let nuevoParZapatos: ParZapatos = new ParZapatos(cantZapatosIngresados, reloj);
              nuevoParZapatos.esperandoReparacion();
              parZapatosEnSistema.push(nuevoParZapatos);
              colaZapatosAReparar.push(nuevoParZapatos);
              break;
            }
          }

          // Eliminamos al cliente atendido del sistema.
          clientesEnSistema.splice(indiceClienteAtendido, 1);

          // Preguntamos si no hay nadie en la cola.
          if (colaClientes.length === 0) {
            // Verificamos si había un par de zapatos siendo reparado antes de que llegara el cliente.
            let parZapatosEnPausa: ParZapatos = parZapatosEnSistema.find(parZapatos => parZapatos.estaPausadoEnReparacion());
            // Si existe, reaunudamos la reparación.
            if (parZapatosEnPausa != null) {
              finReparacion = reloj + tiempoRemanenteReparacion;
              tiempoRemanenteReparacion = -1;
              parZapatosEnPausa.enReparacion();
              zapatero.reparando();
            }
            else {
              // Si no, preguntamos si hay zapatos por reparar.
              if (colaZapatosAReparar.length === 0) zapatero.libre();
              else {
                // Quitamos un par de zapatos de la cola y cambiamos su estado.
                colaZapatosAReparar.shift().enReparacion();
                zapatero.reparando();
                // Calculamos el tiempo de reparación.
                rndReparacion = Math.random();
                tiempoReparacion = this.getTiempoReparacion(rndReparacion);
                tiempoSecado = this.tiempoSecado;
                finReparacion = reloj + tiempoReparacion + tiempoSecado;
              }
            } 
          }
          // Hay clientes en la cola para atender aún.
          else {
            // El zapatero pasa de ocupado a ocupado.
            zapatero.atendiendo();
            // Quitamos un cliente de la cola y cambiamos su estado, según su estado actual.
            let clientePorAtender: Cliente = colaClientes.shift();
            switch (clientePorAtender.getEstado()) {
              // El cliente estaba esperando retirar un par de zapatos.
              case (EstadoCliente.ESPERANDO_RETIRO): {
                clientePorAtender.retirandoZapatos();
      
                // Generamos el tiempo de atención.
                rndAtencion = Math.random();
                tiempoAtencion = this.getTiempoAtencion(rndAtencion);
                finAtencion = reloj + tiempoAtencion;
                break;
              }
              // El cliente estaba esperando hacer un pedido de zapatos.
              case (EstadoCliente.ESPERANDO_HACER_PEDIDO): {
                clientePorAtender.haciendoPedido();
  
                // Generamos el tiempo de atención.
                rndAtencion = Math.random();
                tiempoAtencion = this.getTiempoAtencion(rndAtencion);
                finAtencion = reloj + tiempoAtencion;
                break;
              }
            }
          }
          break;
        }

        // Fin de reparación de un par de zapatos.
        case TipoEvento.FIN_REPARACION: {
          finReparacion = -1;
    
          // Buscamos el par de zapatos que estaba en reparación, le cambiamos el estado y lo agregamos a la cola de zapatos listos para retirar.
          let indiceParZapatosReparado: number = parZapatosEnSistema.findIndex(parZapatos => parZapatos.estaEnReparacion());
          let parZapatosReparado: ParZapatos = parZapatosEnSistema[indiceParZapatosReparado];
          parZapatosReparado.terminarReparacion();
          colaZapatosListos.push(parZapatosReparado);

          // Actualizamos el acumulador de tiempo de reparación de zapatos y el contador de zapatos reparados (ignoramos los primeros 10).
          if (parZapatosReparado.getId() > 10) {
            acumuladorTiempoReparacion += reloj - parZapatosReparado.getMinutoLlegada();
            cantZapatosReparados++;
          }

          // Preguntamos si hay zapatos por reparar
          if (colaZapatosAReparar.length === 0) zapatero.libre();
          else {
            // Quitamos un par de zapatos de la cola y cambiamos su estado.
            colaZapatosAReparar.shift().enReparacion();
            zapatero.reparando();
            // Calculamos el tiempo de reparación.
            rndReparacion = Math.random();
            tiempoReparacion = this.getTiempoReparacion(rndReparacion);
            tiempoSecado = this.tiempoSecado;
            finReparacion = reloj + tiempoReparacion + tiempoSecado;
          }

          break;
        }

        // Fin de recepción pedidos.
        case TipoEvento.FIN_RECEPCION_PEDIDOS: {
          reloj = 480;
          relojHoras.setHours(16, 0, 0);
          zapatero.detenerRecepcionPedidos();
          break;
        }

        // Inicio de una nueva jornada a las 8hs.
        case TipoEvento.INICIO_JORNADA: {
          dia++;
          reloj = 0;
          relojHoras.setHours(8, 0, 0);
          zapatero.habilitarRecepcionPedidos();

          // Cálculo de la próxima llegada.
          rndLlegada = Math.random();
          tiempoEntreLlegadas = this.getTiempoEntreLlegadas(rndLlegada);
          proximaLlegada = reloj + tiempoEntreLlegadas;
          break;
        }

        // Fin de simulación.
        case TipoEvento.FIN_SIMULACION: {
          // Acumulamos los tiempos de atención para los clientes que quedaron en el sistema.
          for (let i: number = 0; i < clientesEnSistema.length; i++) {
            acumuladorTiempoAtencion += reloj - clientesEnSistema[i].getMinutoLlegada();
          }
          // Acumulamos los tiempos de reparación para los zapatos que quedaron en el sistema.
          break;
        }
      }

      // Comparamos la cantidad de zapatos en la cola de la iteración actual con la cantidad máxima.
      cantMaxZapatosEnColaReparacion = Math.max(colaZapatosAReparar.length, cantMaxZapatosEnColaReparacion);

      cantMaxClientesEnCola = Math.max(colaClientes.length, cantMaxClientesEnCola);

      // Cargamos la matriz de estado a mostrar solo para el rango pasado por parámetro.
      if ((i >= eventoDesde && i <= indiceHasta) || i == cantEventos-1) {
        evento.push(
          i.toString(),
          TipoEvento[tipoEvento],
          dia.toString(),
          reloj.toFixed(2),
          relojHoras.toTimeString().substring(0,8),
    
          rndLlegada.toFixed(2),
          tiempoEntreLlegadas.toFixed(2),
          proximaLlegada.toFixed(2),

          rndObjetivoVisita.toFixed(2),
          objetivoVisita,
          rndAtencion.toFixed(2),
          tiempoAtencion.toFixed(2),
          finAtencion.toFixed(2),
    
          rndReparacion.toFixed(2),
          tiempoReparacion.toFixed(2),
          tiempoSecado.toFixed(2),
          finReparacion.toFixed(2),
    
          zapatero.getEstado(),
          zapatero.estaRecibiendoPedidos() ? 'Sí' : 'No',
          colaClientes.length.toString(),
          tiempoRemanenteReparacion.toFixed(2),
          colaZapatosAReparar.length.toString(),
          colaZapatosListos.length.toString(),
    
          acumuladorTiempoReparacion.toFixed(2),
          cantZapatosReparados.toString(),
          cantMaxZapatosEnColaReparacion.toString(),
          acumuladorTiempoAtencion.toFixed(2),
          cantClientesAtendidos.toString(),
          cantClientesRechazados.toString(),
          cantMaxClientesEnCola.toString()
        );

        for (let i: number = 0; i < clientesEnSistema.length; i++) {
          clientesEvento.push(
            clientesEnSistema[i].getId().toString(),
            EstadoCliente[clientesEnSistema[i].getEstado()],
            clientesEnSistema[i].getMinutoLlegada().toFixed(2),
          );
        }

        for (let i: number = 0; i < parZapatosEnSistema.length; i++) {
          zapatosEvento.push(
            parZapatosEnSistema[i].getId().toString(),
            EstadoParZapatos[parZapatosEnSistema[i].getEstado()],
            parZapatosEnSistema[i].getMinutoLlegada().toFixed(2),
          );
        }

        this.matrizEventos.push(evento);
        this.matrizClientes.push(clientesEvento);
        this.matrizZapatos.push(zapatosEvento);

        // Actualizamos la cantidad máxima de pasajeros que hubo en el sistema para las filas a mostrar.
        this.cantMaxClientes = Math.max(clientesEnSistema.length, this.cantMaxClientes);

        // Actualizamos la cantidad máxima de pares de zapatos que hubo en el sistema para las filas a mostrar.
        this.cantMaxParZapatos = Math.max(parZapatosEnSistema.length, this.cantMaxParZapatos);

        // Calculamos las métricas para la última iteración.
        if (i == cantEventos-1) {
          if (cantZapatosReparados != 0)
          this.tiempoPromedioReparacion = acumuladorTiempoReparacion / cantZapatosReparados;

          this.cantMaxZapatosEnColaReparacion = cantMaxZapatosEnColaReparacion;
          this.cantMaxClientesEnCola = cantMaxClientesEnCola;

          if (cantClientesAtendidos != 0)
          this.tiempoPromedioAtencion = acumuladorTiempoAtencion / cantClientesAtendidos;

          if ((cantClientesAtendidos + cantClientesRechazados) != 0)
          this.porcentajeClientesRechazados = cantClientesRechazados / (cantClientesAtendidos + cantClientesRechazados) * 100;
        }
      }

      // Reseteamos algunas variables.
      rndLlegada = -1;
      tiempoEntreLlegadas = -1;
      rndObjetivoVisita = -1;
      objetivoVisita = "";
      rndAtencion = -1;
      tiempoAtencion = -1;
      rndReparacion = -1;
      tiempoReparacion = -1;
      tiempoSecado = -1;
    }
  }

  public getMatrizEstado(): string[][] {
    return this.matrizEventos;
  }

  public getMatrizClientes(): string[][] {
    return this.matrizClientes;
  }

  public getMatrizZapatos(): string[][] {
    return this.matrizZapatos;
  }

  public getTiempoPromedioReparacion(): number {
    return this.tiempoPromedioReparacion;
  }

  public getCantMaxZapatosEnColaReparacion(): number {
    return this.cantMaxZapatosEnColaReparacion;
  }

  public getCantMaxClientesEnCola(): number {
    return this.cantMaxClientesEnCola;
  }

  public getTiempoPromedioAtencion(): number {
    return this.tiempoPromedioAtencion;
  }

  public getPorcentajeClientesRechazados(): number {
    return this.porcentajeClientesRechazados;
  }
  
  // Método que devuelve el evento que sigue, dados los tiempos de los eventos candidatos.
  public getSiguienteEvento(tiemposEventos: number[]): TipoEvento {
    let menor: number = Utils.getMenorMayorACero(tiemposEventos);
    for (let i: number = 0; i < tiemposEventos.length; i++) {
      if (tiemposEventos[i] === menor) return TipoEvento[TipoEvento[i+1]];
    }
    return -1;
  }

  // Devuelve la máxima cantidad de clientes que hubo en algún momento en el sistema para el intervalo de iteraciones a mostrar.
  public getCantMaxClientes(): number {
    return this.cantMaxClientes;
  }

  // Devuelve la máxima cantidad de pares de zapatos que hubo en algún momento en el sistema para el intervalo de iteraciones a mostrar.
  public getCantMaxParZapatos(): number {
    return this.cantMaxParZapatos;
  }

  // Cálculo del tiempo entre llegadas, que tiene distribución exponencial.
  public getTiempoEntreLlegadas(rndLlegada: number): number {
    let tiempo: number = Utils.getDistribucionExponencial(rndLlegada, this.mediaLlegadasClientes);
    return tiempo;
  }

  // Obtención del objetivo de la visita del cliente, según la probabilidad asociada.
  public getObjetivoVisita(rndObjetivo: number): string {
    if (rndObjetivo < this.probObjetivosVisita[0]) return "Retiro";
    return "Pedido";
  }

  // Cálculo del tiempo de atención de cliente, que tiene distribución uniforme.
  public getTiempoAtencion(rndAtencion: number): number {
    let tiempo: number = Utils.getDistribucionUniforme(rndAtencion, this.tiempoAtencionClienteA, this.tiempoAtencionClienteB);
    return tiempo;
  }

  // Cálculo del tiempo de atención de cliente, que tiene distribución uniforme.
  public getTiempoReparacion(rndReparacion: number): number {
    let tiempo: number = Utils.getDistribucionUniforme(rndReparacion, this.tiempoReparacionZapatosA, this.tiempoReparacionZapatosB);
    return tiempo;
  }
}